import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface FontAwesomeStructure {
    svgs: {
        brands: {
            url: string;
            icons: string[];
        };
        regular: {
            url: string;
            icons: string[];
        };
        solid: {
            url: string;
            icons: string[];
        };
    }
}

async function ensureDirectory(dir: string) {
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

async function cloneFontAwesome(tmpDir: string) {
    const faDir = path.join(tmpDir, 'fa');
    try {
        await fs.access(faDir);
        // If directory exists, remove it
        await fs.rm(faDir, { recursive: true });
    } catch { }

    console.log('Cloning Font Awesome repository...');
    await execAsync('git clone --depth 1 https://github.com/FortAwesome/Font-Awesome.git ./tmp/fa');
}

async function cloneFeatherIcons(tmpDir: string) {
    const featherDir = path.join(tmpDir, 'feather');
    try {
        await fs.access(featherDir);
        // If directory exists, remove it
        await fs.rm(featherDir, { recursive: true });
    } catch { }

    console.log('Cloning Feather Icons repository...');
    await execAsync('git clone --depth 1 https://github.com/feathericons/feather.git ./tmp/feather');
}

async function getSvgFiles(directory: string): Promise<string[]> {
    const files = await fs.readdir(directory);
    return files
        .filter(file => file.endsWith('.svg'))
        .map(file => file.replace('.svg', ''))
        .sort((a, b) => a.localeCompare(b));
}

async function main() {
    const tmpDir = path.join(process.cwd(), 'tmp');
    const distDir = path.join(process.cwd(), 'data');

    // Ensure directories exist
    await ensureDirectory(tmpDir);
    await ensureDirectory(distDir);

    // Clone Font Awesome repository
    await cloneFontAwesome(tmpDir);

    // Clone Feather Icons repository
    await cloneFeatherIcons(tmpDir);

    // Define directories to scan for Font Awesome
    const directories = ['brands', 'regular', 'solid'];
    const faStructure: FontAwesomeStructure = {
        svgs: {
            brands: {
                url: 'https://raw.githubusercontent.com/FortAwesome/Font-Awesome/refs/heads/6.x/svgs/brands/$ITEM.svg',
                icons: []
            },
            regular: {
                url: 'https://raw.githubusercontent.com/FortAwesome/Font-Awesome/refs/heads/6.x/svgs/regular/$ITEM.svg',
                icons: []
            },
            solid: {
                url: 'https://raw.githubusercontent.com/FortAwesome/Font-Awesome/refs/heads/6.x/svgs/solid/$ITEM.svg',
                icons: []
            }
        }
    };

    // Scan each directory and collect SVG files for Font Awesome
    for (const dir of directories) {
        const fullPath = path.join(tmpDir, 'fa', 'svgs', dir);
        faStructure.svgs[dir as keyof typeof faStructure.svgs] = {
            url: faStructure.svgs[dir as keyof typeof faStructure.svgs].url,
            icons: await getSvgFiles(fullPath)
        };
    }

    // Write Font Awesome output to dist/fa.json
    const faOutputPath = path.join(distDir, 'fa.json');
    await fs.writeFile(faOutputPath, JSON.stringify(faStructure, null, 2));
    console.log('Generated fa.json successfully!');

    // Define structure for Feather Icons
    const featherStructure = {
        svgs: {
            url: 'https://raw.githubusercontent.com/feathericons/feather/refs/heads/main/icons/$ITEM.svg',
            icons: await getSvgFiles(path.join(tmpDir, 'feather', 'icons'))
        }
    };

    // Write Feather Icons output to dist/feather.json
    const featherOutputPath = path.join(distDir, 'feather.json');
    await fs.writeFile(featherOutputPath, JSON.stringify(featherStructure, null, 2));
    console.log('Generated feather.json successfully!');

    // remove tmp directory
    await fs.rm(tmpDir, { recursive: true });
}

main().catch(console.error);

