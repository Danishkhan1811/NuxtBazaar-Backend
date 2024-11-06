const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    product_image: { 
        type: String 
    },
    product_id: {
        type: Number,
        required: true,
        unique: true,
        index: true
    },
    product_name: {
        type: String,
        required: true,
        trim: true 
    },
    product_description: {
        type: String,
        required: true,
        trim: true
    },
    product_price: {
        type: Number,
        required: true,
        min: [0, 'Product price must be positive'] 
    },
    product_type: {
        type: String,
        required: true,
        trim: true
    },
    product_stock: {
        type: Number,
        required: true,
        min: [0, 'Stock must be positive or zero'] 
    }
}, {
    timestamps: true 
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
