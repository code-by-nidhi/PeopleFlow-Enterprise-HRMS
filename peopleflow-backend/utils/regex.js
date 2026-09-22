module.exports = {
    nameRegex: /^[A-Za-z .'-]{2,50}$/,

    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

    passwordRegex:
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/,

    phoneRegex: /^[6-9]\d{9}$/,

    departmentRegex: /^[A-Za-z& ]{2,50}$/,

    designationRegex: /^[A-Za-z&\-/ ]{2,50}$/
}
