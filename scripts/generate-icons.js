const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Create Photoshop-style gradient background (darker blue to brighter blue)
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#1e40af');  // Dark blue
    gradient.addColorStop(0.5, '#3b82f6'); // Medium blue  
    gradient.addColorStop(1, '#60a5fa');  // Light blue
    
    // Fill background with rounded rectangle (smaller radius for PS style)
    ctx.fillStyle = gradient;
    roundRect(ctx, 0, 0, size, size, size * 0.15);
    ctx.fill();
    
    // Add highlight on top edge (Photoshop style)
    const highlightGradient = ctx.createLinearGradient(0, 0, 0, size * 0.3);
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlightGradient;
    roundRect(ctx, 0, 0, size, size * 0.3, size * 0.15);
    ctx.fill();
    
    // Add inner border/bevel
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = size * 0.008;
    roundRect(ctx, size * 0.02, size * 0.02, size * 0.96, size * 0.96, size * 0.13);
    ctx.stroke();
    
    // Draw large "BT" text (Photoshop style - much bigger and bolder)
    ctx.fillStyle = 'white';
    ctx.font = `900 ${size * 0.55}px Arial, sans-serif`; // Much larger, extra bold
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Add strong text shadow for depth (Photoshop style)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = size * 0.015;
    ctx.shadowOffsetX = size * 0.008;
    ctx.shadowOffsetY = size * 0.012;
    
    // Draw main text
    ctx.fillText('Bt', size / 2, size / 2);
    
    // Add text highlight/bevel effect
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = `900 ${size * 0.55}px Arial, sans-serif`;
    
    // Slight offset for highlight effect
    ctx.fillText('Bt', size / 2 - size * 0.003, size / 2 - size * 0.005);
    
    // Save to file
    const buffer = canvas.toBuffer('image/png');
    const outputPath = path.join(__dirname, '..', 'public', `icon-${size}x${size}.png`);
    fs.writeFileSync(outputPath, buffer);
    console.log(`Generated ${outputPath}`);
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Generate both icon sizes
console.log('Generating Baby Tracker PWA icons...');
generateIcon(192);
generateIcon(512);
console.log('Icons generated successfully!');