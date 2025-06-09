import os
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
import numpy as np
import time
import warnings
import logging
from flask import Flask, render_template, request, jsonify
import tensorflow as tf
from PIL import Image
import io
import base64

# Set environment variables before importing TensorFlow
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['CUDA_VISIBLE_DEVICES'] = '-1'

# Configure TensorFlow
tf.get_logger().setLevel('ERROR')
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Available models dictionary
AVAILABLE_MODELS = {
    'ResNet50': 'resnet50',
    'MobileNetV2': 'mobilenet_v2',
    'InceptionV3': 'inception_v3',
    'EfficientNetB0': 'efficientnet_b0',
    'VGG16': 'vgg16'
}

# Initialize Flask app
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

# Global model cache
model_cache = {}

def load_model(model_name):
    """Load and cache the selected model"""
    try:
        if model_name in model_cache:
            return model_cache[model_name]
            
        tf.keras.backend.clear_session()
        with tf.device('/CPU:0'):
            if model_name == 'resnet50':
                from tensorflow.keras.applications import ResNet50
                model = ResNet50(weights='imagenet')
            elif model_name == 'mobilenet_v2':
                from tensorflow.keras.applications import MobileNetV2
                model = MobileNetV2(weights='imagenet')
            elif model_name == 'inception_v3':
                from tensorflow.keras.applications import InceptionV3
                model = InceptionV3(weights='imagenet')
            elif model_name == 'efficientnet_b0':
                from tensorflow.keras.applications import EfficientNetB0
                model = EfficientNetB0(weights='imagenet')
            elif model_name == 'vgg16':
                from tensorflow.keras.applications import VGG16
                model = VGG16(weights='imagenet')
                
        model_cache[model_name] = model
        logger.info(f"{model_name} model loaded successfully")
        return model
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        return None

def classify_image(image, model_name):
    """Classify image using selected model"""
    try:
        model = load_model(model_name)
        if model is None:
            return {"error": "Model not available"}
            
        # Preprocess image
        img = Image.fromarray(np.array(image))
        
        # Resize according to model requirements
        if model_name in ['inception_v3']:
            target_size = (299, 299)
        else:
            target_size = (224, 224)
            
        img = img.resize(target_size)
        img_array = np.array(img)
        img_array = np.expand_dims(img_array, axis=0)
        
        # Apply model-specific preprocessing
        if model_name == 'resnet50':
            from tensorflow.keras.applications.resnet50 import preprocess_input, decode_predictions
        elif model_name == 'mobilenet_v2':
            from tensorflow.keras.applications.mobilenet_v2 import preprocess_input, decode_predictions
        elif model_name == 'inception_v3':
            from tensorflow.keras.applications.inception_v3 import preprocess_input, decode_predictions
        elif model_name == 'efficientnet_b0':
            from tensorflow.keras.applications.efficientnet import preprocess_input, decode_predictions
        elif model_name == 'vgg16':
            from tensorflow.keras.applications.vgg16 import preprocess_input, decode_predictions
            
        img_array = preprocess_input(img_array)
        predictions = model.predict(img_array, verbose=0)
        results = decode_predictions(predictions, top=5)[0]
        
        # Format results
        formatted_results = []
        for i, (class_id, class_name, confidence) in enumerate(results):
            formatted_results.append({
                "rank": i + 1,
                "class_id": class_id,
                "class_name": class_name.replace('_', ' ').title(),
                "confidence": float(confidence)
            })
            
        return {
            "success": True,
            "model": model_name,
            "timestamp": time.strftime('%H:%M:%S'),
            "predictions": formatted_results
        }
            
    except Exception as e:
        logger.error(f"Classification error: {e}")
        return {"error": str(e)[:100]}

@app.route('/')
def index():
    return render_template('index.html', models=AVAILABLE_MODELS)

@app.route('/api/models', methods=['GET'])
def get_models():
    return jsonify(list(AVAILABLE_MODELS.keys()))

@app.route('/api/classify', methods=['POST'])
def api_classify():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp')):
        return jsonify({"error": "File type not supported"}), 400
    
    model_name = request.form.get('model', 'resnet50')
    if model_name not in AVAILABLE_MODELS:
        return jsonify({"error": "Invalid model selection"}), 400
    
    try:
        # Read and process the image
        img = Image.open(file.stream)
        
        # Classify the image
        results = classify_image(img, AVAILABLE_MODELS[model_name])
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Ensure directories exist
    os.makedirs('static/uploads', exist_ok=True)
    
    # Start the Flask app
    app.run(debug=True, host='0.0.0.0', port=5000)