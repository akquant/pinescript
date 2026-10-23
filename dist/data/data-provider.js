"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadFromFile = loadFromFile;
exports.loadFromURL = loadFromURL;
const json_loader_1 = require("./json-loader");
const csv_loader_1 = require("./csv-loader");
const parquet_loader_1 = require("./parquet-loader");
function getExtension(name) {
    const parts = name.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}
async function loadFromFile(file) {
    const ext = getExtension(file.name);
    if (ext === 'parquet') {
        const buffer = await file.arrayBuffer();
        return (0, parquet_loader_1.loadParquet)(buffer);
    }
    const text = await file.text();
    if (ext === 'csv')
        return (0, csv_loader_1.loadCSV)(text);
    if (ext === 'json')
        return (0, json_loader_1.loadJSON)(text);
    // Fallback: sniff content
    const trimmed = text.trimStart();
    if (trimmed.startsWith('[') || trimmed.startsWith('{'))
        return (0, json_loader_1.loadJSON)(text);
    return (0, csv_loader_1.loadCSV)(text);
}
async function loadFromURL(url) {
    const ext = getExtension(url.split('?')[0]);
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    if (ext === 'parquet') {
        const buffer = await res.arrayBuffer();
        return (0, parquet_loader_1.loadParquet)(buffer);
    }
    const text = await res.text();
    if (ext === 'csv')
        return (0, csv_loader_1.loadCSV)(text);
    return (0, json_loader_1.loadJSON)(text);
}
//# sourceMappingURL=data-provider.js.map