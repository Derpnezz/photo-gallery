"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var usbBasePath = '~/Pictures/photo-gallery-media';
var outputPath = path.join(process.cwd(), 'public', 'metadata-index.json');
function scanDirectory(dirPath, baseSlug) {
    if (baseSlug === void 0) { baseSlug = ''; }
    var index = {};
    function scan(currentPath, currentSlug) {
        var _a;
        if (!fs.existsSync(currentPath))
            return;
        var items = fs.readdirSync(currentPath, { withFileTypes: true });
        var files = [];
        var subFolders = [];
        // Process files
        items.forEach(function (item) {
            if (item.isFile()) {
                var filePath = path.join(currentPath, item.name);
                var ext = path.extname(item.name).toLowerCase();
                var isImage = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext);
                var isVideo = ['.mp4', '.avi', '.mov', '.mkv', '.webm'].includes(ext);
                if (isImage || isVideo) {
                    try {
                        var stats = fs.statSync(filePath);
                        var relativePath = currentPath.replace(usbBasePath + '/', '');
                        var publicPath = relativePath ?
                            "/api/media/".concat(relativePath, "/").concat(item.name) :
                            "/api/media/".concat(item.name);
                        files.push({
                            name: item.name,
                            publicPath: publicPath,
                            type: isImage ? 'image' : 'video',
                            size: stats.size,
                            modified: stats.mtime.toISOString()
                        });
                    }
                    catch (err) {
                        console.error("Error processing file ".concat(item.name, ":"), err);
                    }
                }
            }
            else if (item.isDirectory()) {
                if (!['System Volume Information', '$RECYCLE.BIN', '.Trashes'].includes(item.name) && !item.name.startsWith('.')) {
                    var subSlug = currentSlug ? "".concat(currentSlug, "/").concat(item.name) : item.name;
                    subFolders.push(subSlug);
                    scan(path.join(currentPath, item.name), subSlug);
                }
            }
        });
        // Store folder metadata
        var folderName = currentSlug.split('/').pop() || 'root';
        var thumbnail = (_a = files.find(function (f) { return f.type === 'image'; })) === null || _a === void 0 ? void 0 : _a.publicPath;
        index[currentSlug || 'root'] = {
            name: folderName,
            path: currentPath,
            slug: currentSlug,
            files: files,
            subFolders: subFolders,
            thumbnail: thumbnail
        };
    }
    scan(dirPath, baseSlug);
    return index;
}
console.log('🔍 Scanning directory structure...');
var metadata = scanDirectory(usbBasePath);
console.log("\u2705 Found ".concat(Object.keys(metadata).length, " folders"));
console.log("\uD83D\uDCBE Writing metadata to ".concat(outputPath));
fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));
console.log('✨ Metadata index generated successfully!');
