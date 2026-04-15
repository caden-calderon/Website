#include <libfreenect2/frame_listener_impl.h>
#include <libfreenect2/libfreenect2.hpp>
#include <libfreenect2/logger.h>
#include <libfreenect2/packet_pipeline.h>
#include <libfreenect2/registration.h>

#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <cstdlib>
#include <ctime>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <memory>
#include <sstream>
#include <stdexcept>
#include <string>
#include <thread>
#include <vector>

namespace fs = std::filesystem;

namespace {

constexpr int kDepthWidth = 512;
constexpr int kDepthHeight = 424;
constexpr const char* kColorEncoding = "rgba8-json-base64";
constexpr const char* kDepthEncoding = "float32-meter-json-base64";

struct Options {
  std::string command = "capture";
  fs::path output_dir = "tmp/kinect-capture/live-snapshot";
  fs::path preview_file;
  fs::path heartbeat_file;
  std::string pipeline = "cpu";
  std::string serial;
  fs::path stop_file;
  int frames = 1;
  int warmup_frames = 5;
  int timeout_ms = 10000;
  int idle_timeout_ms = 0;
  int preview_width = 192;
  int preview_height = 160;
  double fps = 12.0;
};

struct CapturedFrame {
  std::vector<std::uint8_t> rgba;
  std::vector<float> depth_meters;
  double timestamp_ms = 0.0;
};

struct DeviceMetadata {
  std::string serial;
  std::string firmware;
};

[[noreturn]] void fail(const std::string& message) {
  throw std::runtime_error(message);
}

std::string json_escape(const std::string& value) {
  std::ostringstream escaped;
  for (char ch : value) {
    switch (ch) {
      case '\\':
        escaped << "\\\\";
        break;
      case '"':
        escaped << "\\\"";
        break;
      case '\n':
        escaped << "\\n";
        break;
      case '\r':
        escaped << "\\r";
        break;
      case '\t':
        escaped << "\\t";
        break;
      default:
        escaped << ch;
        break;
    }
  }
  return escaped.str();
}

std::string base64_encode(const std::uint8_t* data, std::size_t size) {
  static constexpr char table[] =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  std::string encoded;
  encoded.reserve(((size + 2) / 3) * 4);

  for (std::size_t index = 0; index < size; index += 3) {
    const std::uint32_t octet_a = data[index];
    const std::uint32_t octet_b = index + 1 < size ? data[index + 1] : 0;
    const std::uint32_t octet_c = index + 2 < size ? data[index + 2] : 0;
    const std::uint32_t triple = (octet_a << 16) | (octet_b << 8) | octet_c;

    encoded.push_back(table[(triple >> 18) & 0x3F]);
    encoded.push_back(table[(triple >> 12) & 0x3F]);
    encoded.push_back(index + 1 < size ? table[(triple >> 6) & 0x3F] : '=');
    encoded.push_back(index + 2 < size ? table[triple & 0x3F] : '=');
  }

  return encoded;
}

std::string encode_rgba_base64(const std::vector<std::uint8_t>& rgba) {
  return base64_encode(rgba.data(), rgba.size());
}

std::string encode_float32_base64(const std::vector<float>& values) {
  const auto* bytes = reinterpret_cast<const std::uint8_t*>(values.data());
  return base64_encode(bytes, values.size() * sizeof(float));
}

void write_text_file(const fs::path& path, const std::string& contents) {
  fs::create_directories(path.parent_path());
  std::ofstream file(path, std::ios::binary);
  if (!file) {
    fail("Failed to open output file: " + path.string());
  }
  file << contents;
}

void write_text_file_atomic(const fs::path& path, const std::string& contents) {
  fs::create_directories(path.parent_path());
  const fs::path tmp_path = path.string() + ".tmp";
  write_text_file(tmp_path, contents);
  fs::rename(tmp_path, path);
}

std::unique_ptr<libfreenect2::PacketPipeline> make_pipeline(const std::string& name) {
  if (name == "cpu") {
    return std::make_unique<libfreenect2::CpuPacketPipeline>();
  }
#ifdef LIBFREENECT2_WITH_OPENGL_SUPPORT
  if (name == "gl") {
    return std::make_unique<libfreenect2::OpenGLPacketPipeline>();
  }
#endif
  if (name == "default") {
    return nullptr;
  }
  fail("Unsupported pipeline '" + name + "'. Use cpu, gl, or default.");
}

Options parse_args(int argc, char** argv) {
  Options options;
  if (argc >= 2) {
    options.command = argv[1];
  }

  for (int index = 2; index < argc; ++index) {
    const std::string arg(argv[index]);
    auto read_value = [&](const std::string& flag) -> std::string {
      if (index + 1 >= argc) {
        fail("Missing value for " + flag);
      }
      ++index;
      return argv[index];
    };

    if (arg == "--output") {
      options.output_dir = read_value(arg);
    } else if (arg == "--preview-file") {
      options.preview_file = read_value(arg);
    } else if (arg == "--heartbeat-file") {
      options.heartbeat_file = read_value(arg);
    } else if (arg == "--pipeline") {
      options.pipeline = read_value(arg);
    } else if (arg == "--serial") {
      options.serial = read_value(arg);
    } else if (arg == "--stop-file") {
      options.stop_file = read_value(arg);
    } else if (arg == "--frames") {
      options.frames = std::stoi(read_value(arg));
    } else if (arg == "--warmup-frames") {
      options.warmup_frames = std::stoi(read_value(arg));
    } else if (arg == "--timeout-ms") {
      options.timeout_ms = std::stoi(read_value(arg));
    } else if (arg == "--idle-timeout-ms") {
      options.idle_timeout_ms = std::stoi(read_value(arg));
    } else if (arg == "--preview-width") {
      options.preview_width = std::stoi(read_value(arg));
    } else if (arg == "--preview-height") {
      options.preview_height = std::stoi(read_value(arg));
    } else if (arg == "--fps") {
      options.fps = std::stod(read_value(arg));
    } else if (arg == "--help" || arg == "-h") {
      options.command = "help";
    } else {
      fail("Unknown argument: " + arg);
    }
  }

  if (options.frames <= 0) {
    fail("--frames must be positive.");
  }
  if (options.warmup_frames < 0) {
    fail("--warmup-frames must be >= 0.");
  }
  if (options.timeout_ms <= 0) {
    fail("--timeout-ms must be positive.");
  }
  if (options.idle_timeout_ms < 0) {
    fail("--idle-timeout-ms must be >= 0.");
  }
  if (options.preview_width <= 0 || options.preview_height <= 0) {
    fail("--preview-width and --preview-height must be positive.");
  }
  if (options.fps <= 0.0) {
    fail("--fps must be > 0.");
  }

  return options;
}

void print_help(const char* executable) {
  std::cout
      << "Usage:\n"
      << "  " << executable << " probe [--pipeline cpu|gl|default] [--serial SERIAL]\n"
      << "  " << executable << " capture --output DIR [--frames N] [--fps FPS] [--warmup-frames N] [--stop-file PATH]\n"
      << "  " << executable << " preview --preview-file PATH [--fps FPS] [--preview-width W] [--preview-height H]\n"
      << "\n"
      << "Writes the repo's raw registered capture-bundle JSON format using libfreenect2 registration.\n";
}

bool stop_requested(const Options& options) {
  return !options.stop_file.empty() && fs::exists(options.stop_file);
}

bool idle_timeout_elapsed(const Options& options) {
  if (options.heartbeat_file.empty() || options.idle_timeout_ms <= 0) {
    return false;
  }
  if (!fs::exists(options.heartbeat_file)) {
    return false;
  }
  const auto heartbeat_time = fs::last_write_time(options.heartbeat_file);
  const auto age = fs::file_time_type::clock::now() - heartbeat_time;
  return std::chrono::duration_cast<std::chrono::milliseconds>(age).count() > options.idle_timeout_ms;
}

std::string utc_now_iso() {
  const auto now = std::chrono::system_clock::now();
  const auto seconds = std::chrono::time_point_cast<std::chrono::seconds>(now);
  const auto millis = std::chrono::duration_cast<std::chrono::milliseconds>(now - seconds).count();
  const std::time_t time = std::chrono::system_clock::to_time_t(now);
  std::tm tm{};
#if defined(_WIN32)
  gmtime_s(&tm, &time);
#else
  gmtime_r(&time, &tm);
#endif
  std::ostringstream iso;
  iso << std::put_time(&tm, "%Y-%m-%dT%H:%M:%S") << "." << std::setw(3) << std::setfill('0')
      << millis << "+00:00";
  return iso.str();
}

void print_probe(const Options& options) {
  libfreenect2::setGlobalLogger(libfreenect2::createConsoleLogger(libfreenect2::Logger::Error));
  libfreenect2::Freenect2 freenect2;
  const int count = freenect2.enumerateDevices();
  std::cout << "{\n";
  std::cout << "  \"backend_available\": true,\n";
  std::cout << "  \"helper_available\": true,\n";
  std::cout << "  \"device_count\": " << count << ",\n";
  std::cout << "  \"default_serial\": ";
  if (count > 0) {
    std::cout << "\"" << json_escape(options.serial.empty() ? freenect2.getDefaultDeviceSerialNumber() : options.serial) << "\"";
  } else {
    std::cout << "null";
  }
  std::cout << ",\n";
  std::cout << "  \"registration_source_of_truth\": \"libfreenect2\",\n";
  std::cout << "  \"color_resolution\": { \"width\": 1920, \"height\": 1080 },\n";
  std::cout << "  \"depth_resolution\": { \"width\": 512, \"height\": 424 }\n";
  std::cout << "}\n";
}

CapturedFrame capture_registered_frame(
    libfreenect2::SyncMultiFrameListener& listener,
    libfreenect2::Registration& registration,
    int timeout_ms,
    double timestamp_ms) {
  libfreenect2::FrameMap frames;
  if (!listener.waitForNewFrame(frames, timeout_ms)) {
    fail("Timed out waiting for Kinect frame.");
  }

  libfreenect2::Frame* rgb = frames[libfreenect2::Frame::Color];
  libfreenect2::Frame* depth = frames[libfreenect2::Frame::Depth];
  libfreenect2::Frame undistorted(kDepthWidth, kDepthHeight, 4);
  libfreenect2::Frame registered_color(kDepthWidth, kDepthHeight, 4);

  registration.apply(rgb, depth, &undistorted, &registered_color);

  CapturedFrame captured;
  captured.timestamp_ms = timestamp_ms;
  captured.rgba.resize(kDepthWidth * kDepthHeight * 4);
  captured.depth_meters.resize(kDepthWidth * kDepthHeight);

  const auto* registered = reinterpret_cast<const std::uint8_t*>(registered_color.data);
  const auto* depth_values = reinterpret_cast<const float*>(undistorted.data);

  for (int pixel = 0; pixel < kDepthWidth * kDepthHeight; ++pixel) {
    const int base = pixel * 4;
    // libfreenect2 registered color is BGRX. The browser export contract wants RGBA.
    captured.rgba[base] = registered[base + 2];
    captured.rgba[base + 1] = registered[base + 1];
    captured.rgba[base + 2] = registered[base];
    captured.rgba[base + 3] = 255;

    const float millimeters = depth_values[pixel];
    captured.depth_meters[pixel] = std::isfinite(millimeters) && millimeters > 0.0f
        ? millimeters / 1000.0f
        : 0.0f;
  }

  listener.release(frames);
  return captured;
}

std::vector<CapturedFrame> capture_frames(const Options& options, DeviceMetadata& metadata) {
  libfreenect2::setGlobalLogger(libfreenect2::createConsoleLogger(libfreenect2::Logger::Error));
  libfreenect2::Freenect2 freenect2;
  if (freenect2.enumerateDevices() == 0) {
    fail("No Kinect v2 device connected.");
  }

  const std::string serial = options.serial.empty() ? freenect2.getDefaultDeviceSerialNumber() : options.serial;
  std::unique_ptr<libfreenect2::PacketPipeline> pipeline = make_pipeline(options.pipeline);
  libfreenect2::Freenect2Device* device = pipeline
      ? freenect2.openDevice(serial, pipeline.release())
      : freenect2.openDevice(serial);
  if (device == nullptr) {
    fail("Failed to open Kinect v2 device.");
  }

  libfreenect2::SyncMultiFrameListener listener(
      libfreenect2::Frame::Color | libfreenect2::Frame::Ir | libfreenect2::Frame::Depth);
  device->setColorFrameListener(&listener);
  device->setIrAndDepthFrameListener(&listener);

  if (!device->start()) {
    device->close();
    fail("Failed to start Kinect RGB/depth streams.");
  }

  metadata.serial = device->getSerialNumber();
  metadata.firmware = device->getFirmwareVersion();

  libfreenect2::Registration registration(device->getIrCameraParams(), device->getColorCameraParams());

  std::vector<CapturedFrame> captured;
  captured.reserve(options.frames);
  const auto start_time = std::chrono::steady_clock::now();

  try {
    for (int index = 0; index < options.warmup_frames; ++index) {
      libfreenect2::FrameMap frames;
      if (!listener.waitForNewFrame(frames, options.timeout_ms)) {
        fail("Timed out waiting for Kinect warmup frame.");
      }
      listener.release(frames);
    }

    for (int index = 0; index < options.frames; ++index) {
      if (index > 0 && stop_requested(options)) {
        break;
      }

      const auto now = std::chrono::steady_clock::now();
      const double timestamp_ms =
          std::chrono::duration<double, std::milli>(now - start_time).count();
      captured.push_back(capture_registered_frame(listener, registration, options.timeout_ms, timestamp_ms));

      if (options.frames > 1 && index + 1 < options.frames) {
        const auto target = start_time + std::chrono::duration_cast<std::chrono::steady_clock::duration>(
            std::chrono::duration<double>((index + 1) / options.fps));
        while (std::chrono::steady_clock::now() < target && !stop_requested(options)) {
          std::this_thread::sleep_for(std::chrono::milliseconds(5));
        }
      }
    }
  } catch (...) {
    device->stop();
    device->close();
    throw;
  }

  device->stop();
  device->close();
  return captured;
}

void write_frame_json(const fs::path& path, const CapturedFrame& frame, bool color) {
  std::ostringstream json;
  json << "{\n";
  json << "  \"width\": " << kDepthWidth << ",\n";
  json << "  \"height\": " << kDepthHeight << ",\n";
  if (color) {
    json << "  \"encoding\": \"" << kColorEncoding << "\",\n";
    json << "  \"data\": \"" << encode_rgba_base64(frame.rgba) << "\"\n";
  } else {
    json << "  \"encoding\": \"" << kDepthEncoding << "\",\n";
    json << "  \"units\": \"meters\",\n";
    json << "  \"invalidValueMeters\": 0.0,\n";
    json << "  \"data\": \"" << encode_float32_base64(frame.depth_meters) << "\"\n";
  }
  json << "}\n";
  write_text_file(path, json.str());
}

void write_preview_json(
    const fs::path& path,
    const CapturedFrame& frame,
    int frame_index,
    bool recording_active,
    const std::string& raw_take_id,
    int preview_width,
    int preview_height) {
  const int width = std::max(1, preview_width);
  const int height = std::max(1, preview_height);
  std::vector<std::uint8_t> preview_rgba(static_cast<std::size_t>(width) * height * 4);
  std::vector<float> preview_depth(static_cast<std::size_t>(width) * height);

  for (int y = 0; y < height; ++y) {
    const int source_y = std::min(kDepthHeight - 1, (y * kDepthHeight) / height);
    for (int x = 0; x < width; ++x) {
      const int source_x = std::min(kDepthWidth - 1, (x * kDepthWidth) / width);
      const int source_pixel = source_y * kDepthWidth + source_x;
      const int target_pixel = y * width + x;
      const int source_base = source_pixel * 4;
      const int target_base = target_pixel * 4;
      preview_rgba[target_base] = frame.rgba[source_base];
      preview_rgba[target_base + 1] = frame.rgba[source_base + 1];
      preview_rgba[target_base + 2] = frame.rgba[source_base + 2];
      preview_rgba[target_base + 3] = frame.rgba[source_base + 3];
      preview_depth[target_pixel] = frame.depth_meters[source_pixel];
    }
  }

  std::ostringstream json;
  json << std::fixed << std::setprecision(3);
  json << "{\n";
  json << "  \"version\": 1,\n";
  json << "  \"capturedAt\": \"" << utc_now_iso() << "\",\n";
  json << "  \"providerMode\": \"live-kinect\",\n";
  json << "  \"recordingActive\": " << (recording_active ? "true" : "false") << ",\n";
  json << "  \"rawTakeId\": ";
  if (raw_take_id.empty()) {
    json << "null";
  } else {
    json << "\"" << json_escape(raw_take_id) << "\"";
  }
  json << ",\n";
  json << "  \"frameIndex\": " << frame_index << ",\n";
  json << "  \"frameTimestampMs\": " << frame.timestamp_ms << ",\n";
  json << "  \"color\": {\n";
  json << "    \"width\": " << width << ",\n";
  json << "    \"height\": " << height << ",\n";
  json << "    \"encoding\": \"" << kColorEncoding << "\",\n";
  json << "    \"data\": \"" << encode_rgba_base64(preview_rgba) << "\"\n";
  json << "  },\n";
  json << "  \"depth\": {\n";
  json << "    \"width\": " << width << ",\n";
  json << "    \"height\": " << height << ",\n";
  json << "    \"encoding\": \"" << kDepthEncoding << "\",\n";
  json << "    \"units\": \"meters\",\n";
  json << "    \"invalidValueMeters\": 0.0,\n";
  json << "    \"data\": \"" << encode_float32_base64(preview_depth) << "\"\n";
  json << "  }\n";
  json << "}\n";
  write_text_file_atomic(path, json.str());
}

void write_capture_manifest(
    const fs::path& output_dir,
    const Options& options,
    const DeviceMetadata& metadata,
    const std::vector<CapturedFrame>& frames) {
  std::ostringstream json;
  json << std::fixed << std::setprecision(3);
  json << "{\n";
  json << "  \"version\": 1,\n";
  json << "  \"fps\": " << options.fps << ",\n";
  json << "  \"frameCount\": " << frames.size() << ",\n";
  json << "  \"frameTimestampsMs\": [\n";
  for (std::size_t index = 0; index < frames.size(); ++index) {
    json << "    " << frames[index].timestamp_ms << (index + 1 == frames.size() ? "\n" : ",\n");
  }
  json << "  ],\n";
  json << "  \"frames\": [\n";
  for (std::size_t index = 0; index < frames.size(); ++index) {
    json << "    { \"colorFile\": \"frames/color-" << std::setw(4) << std::setfill('0') << index
         << ".json\", \"depthFile\": \"frames/depth-" << std::setw(4) << std::setfill('0') << index
         << ".json\" }" << (index + 1 == frames.size() ? "\n" : ",\n");
  }
  json << std::setfill(' ');
  json << "  ],\n";
  json << "  \"clips\": [\n";
  json << "    { \"id\": \"kinect_live_full\", \"startFrame\": 0, \"endFrame\": "
       << (frames.empty() ? 0 : frames.size() - 1) << ", \"mode\": \"once\" }\n";
  json << "  ],\n";
  json << "  \"color\": {\n";
  json << "    \"width\": " << kDepthWidth << ",\n";
  json << "    \"height\": " << kDepthHeight << ",\n";
  json << "    \"encoding\": \"" << kColorEncoding << "\",\n";
  json << "    \"description\": \"Kinect RGB registered into the Kinect depth raster grid.\"\n";
  json << "  },\n";
  json << "  \"depth\": {\n";
  json << "    \"width\": " << kDepthWidth << ",\n";
  json << "    \"height\": " << kDepthHeight << ",\n";
  json << "    \"encoding\": \"" << kDepthEncoding << "\",\n";
  json << "    \"units\": \"meters\",\n";
  json << "    \"invalidValueMeters\": 0.0,\n";
  json << "    \"description\": \"Kinect depth in meters aligned to the same registered raster grid.\"\n";
  json << "  },\n";
  json << "  \"registration\": {\n";
  json << "    \"provider\": \"libfreenect2\",\n";
  json << "    \"alignedTo\": \"depth-grid\",\n";
  json << "    \"status\": \"live-registered-kinect-rgbd\",\n";
  json << "    \"colorSource\": \"kinect-registered-color\"\n";
  json << "  },\n";
  json << "  \"capture\": {\n";
  json << "    \"sensor\": \"kinect-v2\",\n";
  json << "    \"serial\": \"" << json_escape(metadata.serial) << "\",\n";
  json << "    \"calibration\": {\n";
  json << "      \"source\": \"device-factory-calibration\",\n";
  json << "      \"registrationProvider\": \"libfreenect2\",\n";
  json << "      \"colorResolution\": { \"width\": 1920, \"height\": 1080 },\n";
  json << "      \"depthResolution\": { \"width\": " << kDepthWidth << ", \"height\": " << kDepthHeight << " }\n";
  json << "    },\n";
  json << "    \"metadata\": {\n";
  json << "      \"purpose\": \"live-kinect-rgbd-capture\",\n";
  json << "      \"helper\": \"cpp/kinect_capture/kinect_capture_helper.cpp\",\n";
  json << "      \"firmware\": \"" << json_escape(metadata.firmware) << "\",\n";
  json << "      \"pipeline\": \"" << json_escape(options.pipeline) << "\"\n";
  json << "    }\n";
  json << "  }\n";
  json << "}\n";
  write_text_file(output_dir / "capture.json", json.str());
}

void capture_command(const Options& options) {
  DeviceMetadata metadata;
  const std::vector<CapturedFrame> frames = capture_frames(options, metadata);
  fs::create_directories(options.output_dir / "frames");

  for (std::size_t index = 0; index < frames.size(); ++index) {
    std::ostringstream color_name;
    color_name << "color-" << std::setw(4) << std::setfill('0') << index << ".json";
    std::ostringstream depth_name;
    depth_name << "depth-" << std::setw(4) << std::setfill('0') << index << ".json";
    write_frame_json(options.output_dir / "frames" / color_name.str(), frames[index], true);
    write_frame_json(options.output_dir / "frames" / depth_name.str(), frames[index], false);
  }

  write_capture_manifest(options.output_dir, options, metadata, frames);
  std::cout << "{\n";
  std::cout << "  \"output\": \"" << json_escape(options.output_dir.string()) << "\",\n";
  std::cout << "  \"frameCount\": " << frames.size() << ",\n";
  std::cout << "  \"serial\": \"" << json_escape(metadata.serial) << "\"\n";
  std::cout << "}\n";
}

void preview_command(const Options& options) {
  if (options.preview_file.empty()) {
    fail("--preview-file is required for preview.");
  }

  DeviceMetadata metadata;
  libfreenect2::setGlobalLogger(libfreenect2::createConsoleLogger(libfreenect2::Logger::Error));
  libfreenect2::Freenect2 freenect2;
  if (freenect2.enumerateDevices() == 0) {
    fail("No Kinect v2 device connected.");
  }

  const std::string serial = options.serial.empty() ? freenect2.getDefaultDeviceSerialNumber() : options.serial;
  std::unique_ptr<libfreenect2::PacketPipeline> pipeline = make_pipeline(options.pipeline);
  libfreenect2::Freenect2Device* device = pipeline
      ? freenect2.openDevice(serial, pipeline.release())
      : freenect2.openDevice(serial);
  if (device == nullptr) {
    fail("Failed to open Kinect v2 device.");
  }

  libfreenect2::SyncMultiFrameListener listener(
      libfreenect2::Frame::Color | libfreenect2::Frame::Ir | libfreenect2::Frame::Depth);
  device->setColorFrameListener(&listener);
  device->setIrAndDepthFrameListener(&listener);

  if (!device->start()) {
    device->close();
    fail("Failed to start Kinect RGB/depth streams.");
  }

  metadata.serial = device->getSerialNumber();
  metadata.firmware = device->getFirmwareVersion();
  libfreenect2::Registration registration(device->getIrCameraParams(), device->getColorCameraParams());

  int written = 0;
  const auto start_time = std::chrono::steady_clock::now();

  try {
    for (int index = 0; index < options.warmup_frames; ++index) {
      libfreenect2::FrameMap frames;
      if (!listener.waitForNewFrame(frames, options.timeout_ms)) {
        fail("Timed out waiting for Kinect warmup frame.");
      }
      listener.release(frames);
    }

    while (written < options.frames && !stop_requested(options) && !idle_timeout_elapsed(options)) {
      const auto now = std::chrono::steady_clock::now();
      const double timestamp_ms =
          std::chrono::duration<double, std::milli>(now - start_time).count();
      const CapturedFrame frame = capture_registered_frame(listener, registration, options.timeout_ms, timestamp_ms);
      write_preview_json(
          options.preview_file,
          frame,
          written,
          false,
          "",
          options.preview_width,
          options.preview_height);
      ++written;

      const auto target = start_time + std::chrono::duration_cast<std::chrono::steady_clock::duration>(
          std::chrono::duration<double>(written / options.fps));
        while (std::chrono::steady_clock::now() < target && !stop_requested(options) && !idle_timeout_elapsed(options)) {
          std::this_thread::sleep_for(std::chrono::milliseconds(5));
        }
      }
  } catch (...) {
    device->stop();
    device->close();
    throw;
  }

  device->stop();
  device->close();
  std::cout << "{\n";
  std::cout << "  \"previewFile\": \"" << json_escape(options.preview_file.string()) << "\",\n";
  std::cout << "  \"frameCount\": " << written << ",\n";
  std::cout << "  \"serial\": \"" << json_escape(metadata.serial) << "\"\n";
  std::cout << "}\n";
}

}  // namespace

int main(int argc, char** argv) {
  try {
    const Options options = parse_args(argc, argv);
    if (options.command == "help" || options.command == "--help" || options.command == "-h") {
      print_help(argv[0]);
      return 0;
    }
    if (options.command == "probe") {
      print_probe(options);
      return 0;
    }
    if (options.command == "capture") {
      capture_command(options);
      return 0;
    }
    if (options.command == "preview") {
      preview_command(options);
      return 0;
    }
    fail("Unsupported command: " + options.command);
  } catch (const std::exception& error) {
    std::cerr << "kinect_capture_helper: " << error.what() << "\n";
    return 1;
  }
}
