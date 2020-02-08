const mongoose =  require('mongoose');

const schema = new mongoose.Schema({
    label: {
        type: String,
        required: true,
     },
     country: {
        type: String,
        required: true,
     },
     abbreviation: {
        type: String,
        required: true,
     },
     currency_code: {
        type: String,
        required: true,
     },
     country_code: {
        type: String,
        required: true,
     },
     alpha3Code: {
        type: String,
        required: true,
     }

});

module.exports = mongoose.model('country_datas', schema,'country_datas');
