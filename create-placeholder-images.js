// Script to generate placeholder images for circuit components

document.addEventListener('DOMContentLoaded', function() {
    const componentTypes = [
        'resistor', 
        'capacitor', 
        'inductor', 
        'voltage-source', 
        'current-source', 
        'diode', 
        'transistor', 
        'ground'
    ];
    
    // Create a canvas to generate images
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    // Generate placeholder image for each component
    componentTypes.forEach(type => {
        createComponentImage(type, ctx, canvas);
    });
    
    // Create a default component image
    createComponentImage('component-default', ctx, canvas);
    
    console.log('Placeholder images have been generated!');
});

function createComponentImage(type, ctx, canvas) {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set background color
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw component name
    ctx.fillStyle = '#333';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(formatComponentName(type), canvas.width / 2, 50);
    
    // Draw component symbol
    drawComponentSymbol(type, ctx, canvas.width / 2, canvas.height / 2);
    
    // Convert canvas to image data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    // Create a link to download the image
    const link = document.createElement('a');
    link.href = imageDataUrl;
    link.download = `${type}-real.jpg`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function formatComponentName(type) {
    // Convert kebab-case to Title Case
    return type.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function drawComponentSymbol(type, ctx, centerX, centerY) {
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 3;
    
    switch(type) {
        case 'resistor':
            // Draw resistor zigzag
            ctx.beginPath();
            ctx.moveTo(centerX - 60, centerY);
            for (let i = 0; i < 7; i++) {
                ctx.lineTo(centerX - 50 + i * 20, centerY + (i % 2 === 0 ? 20 : -20));
            }
            ctx.lineTo(centerX + 60, centerY);
            ctx.stroke();
            break;
            
        case 'capacitor':
            // Draw capacitor plates
            ctx.beginPath();
            ctx.moveTo(centerX - 60, centerY);
            ctx.lineTo(centerX - 10, centerY);
            ctx.moveTo(centerX - 10, centerY - 30);
            ctx.lineTo(centerX - 10, centerY + 30);
            ctx.moveTo(centerX + 10, centerY - 30);
            ctx.lineTo(centerX + 10, centerY + 30);
            ctx.moveTo(centerX + 10, centerY);
            ctx.lineTo(centerX + 60, centerY);
            ctx.stroke();
            break;
            
        case 'inductor':
            // Draw inductor coils
            ctx.beginPath();
            ctx.moveTo(centerX - 60, centerY);
            ctx.lineTo(centerX - 40, centerY);
            for (let i = 0; i < 4; i++) {
                const x = centerX - 30 + i * 20;
                ctx.arc(x, centerY, 10, Math.PI, 0, false);
            }
            ctx.lineTo(centerX + 60, centerY);
            ctx.stroke();
            break;
            
        case 'voltage-source':
            // Draw battery symbol
            ctx.beginPath();
            ctx.moveTo(centerX - 60, centerY);
            ctx.lineTo(centerX - 20, centerY);
            ctx.moveTo(centerX - 20, centerY - 20);
            ctx.lineTo(centerX - 20, centerY + 20);
            ctx.moveTo(centerX - 10, centerY - 10);
            ctx.lineTo(centerX - 10, centerY + 10);
            ctx.moveTo(centerX - 10, centerY);
            ctx.lineTo(centerX + 60, centerY);
            ctx.stroke();
            
            // Draw + and - symbols
            ctx.font = 'bold 20px Arial';
            ctx.fillText('+', centerX - 20, centerY - 30);
            ctx.fillText('-', centerX - 10, centerY - 30);
            break;
            
        case 'current-source':
            // Draw current source circle with arrow
            ctx.beginPath();
            ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
            ctx.stroke();
            
            // Draw arrow
            ctx.beginPath();
            ctx.moveTo(centerX - 15, centerY);
            ctx.lineTo(centerX + 15, centerY);
            ctx.lineTo(centerX + 5, centerY - 10);
            ctx.moveTo(centerX + 15, centerY);
            ctx.lineTo(centerX + 5, centerY + 10);
            ctx.stroke();
            break;
            
        case 'diode':
            // Draw diode triangle and line
            ctx.beginPath();
            ctx.moveTo(centerX - 60, centerY);
            ctx.lineTo(centerX - 20, centerY);
            ctx.moveTo(centerX - 20, centerY - 20);
            ctx.lineTo(centerX - 20, centerY + 20);
            ctx.lineTo(centerX + 20, centerY);
            ctx.lineTo(centerX - 20, centerY - 20);
            ctx.moveTo(centerX + 20, centerY - 20);
            ctx.lineTo(centerX + 20, centerY + 20);
            ctx.moveTo(centerX + 20, centerY);
            ctx.lineTo(centerX + 60, centerY);
            ctx.stroke();
            break;
            
        case 'transistor':
            // Draw transistor symbol (NPN)
            ctx.beginPath();
            ctx.moveTo(centerX - 20, centerY - 30);
            ctx.lineTo(centerX - 20, centerY + 30);
            ctx.moveTo(centerX - 20, centerY);
            ctx.lineTo(centerX + 20, centerY - 30);
            ctx.moveTo(centerX - 20, centerY);
            ctx.lineTo(centerX + 20, centerY + 30);
            ctx.moveTo(centerX + 20, centerY - 30);
            ctx.lineTo(centerX + 40, centerY - 30);
            ctx.moveTo(centerX + 20, centerY + 30);
            ctx.lineTo(centerX + 40, centerY + 30);
            ctx.moveTo(centerX - 40, centerY);
            ctx.lineTo(centerX - 20, centerY);
            ctx.stroke();
            
            // Draw arrow
            ctx.beginPath();
            ctx.moveTo(centerX + 15, centerY + 15);
            ctx.lineTo(centerX + 5, centerY + 25);
            ctx.stroke();
            break;
            
        case 'ground':
            // Draw ground symbol
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - 30);
            ctx.lineTo(centerX, centerY);
            ctx.moveTo(centerX - 30, centerY);
            ctx.lineTo(centerX + 30, centerY);
            ctx.moveTo(centerX - 20, centerY + 10);
            ctx.lineTo(centerX + 20, centerY + 10);
            ctx.moveTo(centerX - 10, centerY + 20);
            ctx.lineTo(centerX + 10, centerY + 20);
            ctx.stroke();
            break;
            
        case 'component-default':
            // Draw generic component box
            ctx.beginPath();
            ctx.rect(centerX - 40, centerY - 30, 80, 60);
            ctx.stroke();
            
            // Draw connection points
            ctx.beginPath();
            ctx.moveTo(centerX - 60, centerY);
            ctx.lineTo(centerX - 40, centerY);
            ctx.moveTo(centerX + 40, centerY);
            ctx.lineTo(centerX + 60, centerY);
            ctx.stroke();
            
            // Draw text
            ctx.fillStyle = '#3B82F6';
            ctx.font = '16px Arial';
            ctx.fillText('Component', centerX, centerY + 5);
            break;
    }
    
    // Draw component ID
    ctx.fillStyle = '#666';
    ctx.font = '14px Arial';
    ctx.fillText(`ID: ${type}`, centerX, centerY + 60);
} 