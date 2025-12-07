const fs = require('fs');
const path = require('path');

// Try to use sharp if available, otherwise use a fallback
let sharp;
try {
    sharp = require('sharp');
} catch (e) {
    console.log('Sharp not installed. Installing...');
    // We'll handle this differently
}

async function compressImages() {
    const imagesDir = path.join(__dirname, '../public/images/game-items');
    const files = fs.readdirSync(imagesDir).filter(f => f.endsWith('.png'));

    if (files.length === 0) {
        console.log('No PNG images found');
        return;
    }

    // Map files to item names (you may need to adjust based on which is which)
    const fileMap = {
        sword: files.find(f => f.toLowerCase().includes('sword') || f.includes('bmyhn')) || files[0],
        shield: files.find(f => f.toLowerCase().includes('shield') || f.includes('kurwlv')) || files[1]
    };

    if (!sharp) {
        // Fallback: just rename the files
        console.log('Sharp not available. Renaming files only...');
        if (fileMap.sword && fileMap.sword !== 'sword.png') {
            fs.renameSync(
                path.join(imagesDir, fileMap.sword),
                path.join(imagesDir, 'sword.png')
            );
            console.log(`Renamed ${fileMap.sword} to sword.png`);
        }
        if (fileMap.shield && fileMap.shield !== 'shield.png') {
            fs.renameSync(
                path.join(imagesDir, fileMap.shield),
                path.join(imagesDir, 'shield.png')
            );
            console.log(`Renamed ${fileMap.shield} to shield.png`);
        }
        return;
    }

    // Compress and resize images
    for (const [itemName, fileName] of Object.entries(fileMap)) {
        if (!fileName) continue;

        const inputPath = path.join(imagesDir, fileName);
        const outputPath = path.join(imagesDir, `${itemName}.png`);

        try {
            await sharp(inputPath)
                .resize(512, 512, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .png({
                    quality: 85,
                    compressionLevel: 9
                })
                .toFile(outputPath);

            // Remove original if different name
            if (fileName !== `${itemName}.png`) {
                fs.unlinkSync(inputPath);
            }

            const stats = fs.statSync(outputPath);
            console.log(`✓ Compressed ${itemName}.png (${(stats.size / 1024).toFixed(1)}KB)`);
        } catch (error) {
            console.error(`Error processing ${fileName}:`, error.message);
        }
    }
}

compressImages().catch(console.error);

