const passwordValidator = require('password-validator');

const schema = new passwordValidator();

// Add password rules
schema
    .is().min(8)                                    // Minimum length 8
    .is().max(100)                                  // Maximum length 100
    .has().uppercase()                              // Must have uppercase letters
    .has().lowercase()                              // Must have lowercase letters
    .has().digits(1)                                // Must have at least 1 digit
    .has().symbols(1)                               // Must have at least 1 symbol
    .has().not().spaces()                           // Should not have spaces
    .is().not().oneOf(['Passw0rd', 'Password123']); // Blacklist these values

const validatePassword = (req, res, next) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({
            message: 'Password is required',
            requirements: getPasswordRequirements()
        });
    }

    const validationResult = schema.validate(password, { list: true });

    if (validationResult.length === 0) {
        next();
    } else {
        res.status(400).json({
            message: 'Password does not meet requirements',
            errors: formatValidationErrors(validationResult),
            requirements: getPasswordRequirements()
        });
    }
};

const getPasswordRequirements = () => {
    return {
        minLength: 8,
        maxLength: 100,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: true,
        noSpaces: true
    };
};

const formatValidationErrors = (validationResult) => {
    const errorMessages = {
        min: 'Password must be at least 8 characters long',
        max: 'Password must not exceed 100 characters',
        uppercase: 'Password must contain at least one uppercase letter',
        lowercase: 'Password must contain at least one lowercase letter',
        digits: 'Password must contain at least one number',
        symbols: 'Password must contain at least one special character',
        spaces: 'Password must not contain spaces',
        oneOf: 'Password is too common'
    };

    return validationResult.map(error => errorMessages[error]);
};

module.exports = {
    validatePassword,
    getPasswordRequirements
};
