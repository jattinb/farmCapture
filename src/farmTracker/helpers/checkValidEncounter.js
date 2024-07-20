// Function to detect valid encounter using OCR result
const checkValidEncounter = (text) => {
    const words = text.toLowerCase().split(/\W+/);
    const vsIndex = words.indexOf('vs');
    if (vsIndex !== -1 && vsIndex < words.length - 1 && words[vsIndex + 1] === 'wild') {
        console.log('Encounter found:', words[vsIndex + 2]);
        return { valid: true, curPoke: words[vsIndex + 2] };
    }
    return { valid: false, curPoke: null };
};

module.exports = checkValidEncounter