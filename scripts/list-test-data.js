const fs = require('fs');
const path = require('path');

const testDataDir = path.join(process.cwd(), 'test-data');

console.log('=== Directory Listing ===');
console.log('Looking in:', testDataDir);

try {
    // Check if directory exists
    if (!fs.existsSync(testDataDir)) {
        console.log('test-data directory does not exist!');
        process.exit(1);
    }

    // List contents
    const items = fs.readdirSync(testDataDir, { withFileTypes: true });
    
    console.log('\nFiles:');
    items.filter(item => item.isFile())
        .forEach(file => {
            const stats = fs.statSync(path.join(testDataDir, file.name));
            console.log(`- ${file.name} (${stats.size} bytes)`);
        });

    console.log('\nDirectories:');
    items.filter(item => item.isDirectory())
        .forEach(dir => {
            console.log(`- ${dir.name}/`);
        });

} catch (error) {
    console.error('Error:', error);
    process.exit(1);
}

console.log('\n=== Listing Complete ===');
