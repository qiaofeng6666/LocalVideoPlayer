# 🎬 Node.js 视频服务器

一个基于 Express 的简单视频服务器，支持从多个目录提供视频文件列表和静态视频流服务，并支持视频播放时的拖动进度条（Range 请求）。同时提供了可选的 HTTPS 支持。

## 📋 功能特性

- 递归扫描指定目录下的视频文件（支持 `.mp4`、`.mov`、`.avi` 格式）
- 提供两个独立的视频源目录（`/videos` 和 `/videos2`）
- RESTful API 返回视频文件的相对路径列表，方便前端直接使用
- 静态视频文件服务支持 **Range 请求**，可在网页播放器中自由拖动进度条
- 对 `.mp4` 文件设置强缓存（`Cache-Control: public, max-age=31536000, immutable`），提升二次访问速度
- 可选 HTTPS 支持，只需准备证书文件即可启用

## 🛠️ 技术栈

- Node.js
- Express
- 原生 `fs` / `fs.promises` 模块

## 📦 安装与运行

### 1. 克隆仓库

```bash
git clone https://github.com/your-username/video-server.git
cd video-server
```
### 2. 安装依赖
```bash
npm install express
```
本项目仅依赖 express，无需额外包。

### 3. 配置视频目录
打开 app.js（或主文件），找到以下两行，将其修改为你本地的实际视频文件夹路径：

```javascript
const VIDEO_1_FOLDER_PATH = path.resolve(`D:/videos`);
const VIDEO_2_FOLDER_PATH = path.resolve(`D:/videos2`);
```
你也可以改为从环境变量读取，例如：

```javascript
const VIDEO_1_FOLDER_PATH = process.env.VIDEO_1_PATH || path.resolve(`D:/videos`);
const VIDEO_2_FOLDER_PATH = process.env.VIDEO_2_PATH || path.resolve(`D:/videos2`);
```
### 4. 启动服务器
```bash
node app.js
```
默认 `HTTP` 服务将运行在 http://localhost:3000 （可通过 PORT 环境变量修改）。

### 5. （可选）启用 HTTPS
如果你有 SSL 证书（私钥和证书文件），请将它们放在 `./certs/` 目录下，文件名为 `private.key` 和 `certificate.crt`，服务器将自动在 3443 端口启动 HTTPS 服务。

若暂无证书，可使用以下命令生成自签名证书（仅用于测试）：

```bash
mkdir certs
openssl req -x509 -newkey rsa:4096 -keyout certs/private.key -out certs/certificate.crt -days 365 -nodes
```
## 🔌 API 文档
### GET `/api/videos`
返回 `VIDEO_1_FOLDER_PATH` 目录下所有受支持视频文件的相对 URL 列表。

响应示例：

```json
[
  "/videos/movie1.mp4",
  "/videos/subfolder/clip2.mp4"
]
```
### GET `/api/videos2`
同上，但针对 `VIDEO_2_FOLDER_PATH` 目录。

## 📁 静态文件服务
`/videos/*` – 映射到 `VIDEO_1_FOLDER_PATH` 目录

`/videos2/*` – 映射到 `VIDEO_2_FOLDER_PATH` 目录

两个路由均支持 `Range` 请求，可直接用于 HTML5 `<video>` 标签：

```html
<video src="/videos/movie1.mp4" controls></video>
```
## 🌐 根路由
访问根路径 / 会显示一个简单的导航页面，列出两个 API 的链接，方便测试。

## ⚙️ 环境变量（可选）
| 变量名	| 说明	| 默认值 |
| :---: | :---: | :---: |
| PORT	| HTTP | 监听端口	3000 |
| VIDEO_1_PATH	| 第一个视频目录路径	| D:/videos |
| VIDEO_2_PATH	| 第二个视频目录路径	| D:/videos2 |

如果你通过环境变量配置目录，记得修改代码中的读取逻辑（参考上文）。

## 📝 注意事项
该服务器不包含用户认证，请勿直接暴露在公网，建议在内网使用或配合反向代理添加权限控制。

支持的文件格式仅为 `.mp4`, `.mov`, `.avi`，如需扩展，可在 `supportedFormats` 数组中添加。

对于非常大的视频文件，请确保服务器有足够的内存和带宽，`Node.js` 的 `express.static` 会利用流式传输，不会将文件完全加载到内存中。

`HTTPS` 自签名证书在浏览器中会显示不安全提示，仅用于测试环境；生产环境请使用受信任的证书。

## 📄 许可证
```
本项目采用 MIT 许可证。
```