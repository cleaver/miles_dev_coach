// Shared array index validation utility
function validateArrayIndex(index, array, fieldName = 'Index') {
    const numIndex = Number(index);
    if (
        typeof numIndex !== 'number' ||
        !Number.isInteger(numIndex) ||
        isNaN(numIndex) ||
        numIndex < 1 ||
        numIndex > array.length
    ) {
        return {
            valid: false,
            error: `${fieldName} must be between 1 and ${array.length}`
        };
    }
    return { valid: true, value: numIndex - 1 };
}

module.exports = { validateArrayIndex }; 