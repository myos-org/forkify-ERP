import React, { useState } from 'react';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';
import { ChefHat, Plus, Minus, Loader, CheckCircle, XCircle } from 'lucide-react';
import { Helmet } from "react-helmet-async";

const API_URL = 'https://forkify-api.herokuapp.com/api/v2/recipes';
const API_KEY = '9e7ba24e-6cda-4995-853e-2b0d089538f0';

function AddRecipe({ currentUser, onLogout, isSidebarOpen, setIsSidebarOpen }) {
  const [formData, setFormData] = useState({
    title: '',
    source_url: '',
    image_url: '',
    publisher: currentUser?.name || '',
    cooking_time: 30,
    servings: 2,
    ingredients: [
      { quantity: '', unit: '', description: '' }
    ]
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleIngredientChange = (index, field, value) => {
    const updatedIngredients = [...formData.ingredients];
    updatedIngredients[index] = {
      ...updatedIngredients[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      ingredients: updatedIngredients
    }));
  };

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { quantity: '', unit: '', description: '' }]
    }));
  };

  const removeIngredient = (index) => {
    if (formData.ingredients.length > 1) {
      const updatedIngredients = formData.ingredients.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        ingredients: updatedIngredients
      }));
    }
  };

  const handleServingsChange = (type) => {
    if (type === 'increase') {
      setFormData(prev => ({
        ...prev,
        servings: prev.servings + 1
      }));
    } else if (type === 'decrease' && formData.servings > 1) {
      setFormData(prev => ({
        ...prev,
        servings: prev.servings - 1
      }));
    }
  };

  const handleTimeChange = (type) => {
    if (type === 'increase') {
      setFormData(prev => ({
        ...prev,
        cooking_time: prev.cooking_time + 5
      }));
    } else if (type === 'decrease' && formData.cooking_time > 5) {
      setFormData(prev => ({
        ...prev,
        cooking_time: prev.cooking_time - 5
      }));
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Recipe title is required');
      return false;
    }
    
    if (!formData.source_url.trim()) {
      setError('Source URL is required');
      return false;
    }
    
    if (!formData.image_url.trim()) {
      setError('Image URL is required');
      return false;
    }
    
    if (!formData.publisher.trim()) {
      setError('Publisher name is required');
      return false;
    }
    
    if (formData.cooking_time < 1) {
      setError('Cooking time must be at least 1 minute');
      return false;
    }
    
    if (formData.servings < 1) {
      setError('Servings must be at least 1');
      return false;
    }
    
    // Validate ingredients
    for (const ingredient of formData.ingredients) {
      if (!ingredient.description.trim()) {
        setError('Ingredient description is required for all ingredients');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Format ingredients for API
      const formattedIngredients = formData.ingredients.map(ing => ({
        quantity: ing.quantity ? Number(ing.quantity) : null,
        unit: ing.unit || '',
        description: ing.description
      }));
      
      const payload = {
        title: formData.title,
        source_url: formData.source_url,
        image_url: formData.image_url,
        publisher: formData.publisher,
        cooking_time: Number(formData.cooking_time),
        servings: Number(formData.servings),
        ingredients: formattedIngredients
      };
      
      const response = await fetch(`${API_URL}/?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setSuccess(true);
        // Reset form
        setFormData({
          title: '',
          source_url: '',
          image_url: '',
          publisher: currentUser?.name || '',
          cooking_time: 30,
          servings: 2,
          ingredients: [
            { quantity: '', unit: '', description: '' }
          ]
        });
        
        // Reset success message after 5 seconds
        setTimeout(() => {
          setSuccess(false);
        }, 5000);
      } else {
        setError(data.message || 'Failed to add recipe. Please try again.');
      }
    } catch (err) {
      console.error('Error adding recipe:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Helmet>
        <title>Add Recipe | Forkify</title>
      </Helmet>
      
      <Sidebar 
        currentUser={currentUser}
        onLogout={onLogout}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <div className={`main-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="main-wrapper">
       

<Header 
  searchQuery=""
  setSearchQuery={() => {}}
  handleSearch={(e) => e.preventDefault()}
  currentUser={currentUser}
  onLogout={onLogout}
  onToggleMobileMenu={() => setIsSidebarOpen(!isSidebarOpen)}
  bookmarksCount={0}
/>

          <div className="add-recipe-container">
            <div className="add-recipe-header">
              <h1 className="add-recipe-title">
                <ChefHat className="add-recipe-icon" />
                Add Your Recipe
              </h1>
              <p className="add-recipe-subtitle">
                Share your culinary masterpiece with the Forkify community
              </p>
            </div>

            {error && (
              <div className="add-recipe-error">
                <XCircle className="error-icon" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="add-recipe-success">
                <CheckCircle className="success-icon" />
                <p>Recipe added successfully! Your recipe is now live.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="add-recipe-form">
              <div className="form-grid">
                {/* Basic Information */}
                <div className="form-section">
                  <h2 className="section-title">Basic Information</h2>
                  
                  <div className="form-group">
                    <label htmlFor="title" className="form-label">
                      Recipe Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Enter recipe title"
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="publisher" className="form-label">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        id="publisher"
                        name="publisher"
                        value={formData.publisher}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="Enter your name"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="source_url" className="form-label">
                      Source URL *
                    </label>
                    <input
                      type="url"
                      id="source_url"
                      name="source_url"
                      value={formData.source_url}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="https://example.com/your-recipe"
                      required
                    />
                    <small className="form-hint">
                      Link to the original recipe or your blog post
                    </small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="image_url" className="form-label">
                      Image URL *
                    </label>
                    <input
                      type="url"
                      id="image_url"
                      name="image_url"
                      value={formData.image_url}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="https://example.com/image.jpg"
                      required
                    />
                    <small className="form-hint">
                      Direct link to a high-quality recipe image
                    </small>
                  </div>
                </div>

                {/* Cooking Details */}
                <div className="form-section">
                  <h2 className="section-title">Cooking Details</h2>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        Cooking Time (minutes) *
                      </label>
                      <div className="number-input-group">
                        <button
                          type="button"
                          className="number-btn decrease"
                          onClick={() => handleTimeChange('decrease')}
                          disabled={formData.cooking_time <= 5}
                        >
                          <Minus size={16} />
                        </button>
                        <input
                          type="number"
                          value={formData.cooking_time}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            cooking_time: Math.max(5, parseInt(e.target.value) || 30)
                          }))}
                          className="number-input"
                          min="5"
                          step="5"
                          required
                        />
                        <button
                          type="button"
                          className="number-btn increase"
                          onClick={() => handleTimeChange('increase')}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Servings *
                      </label>
                      <div className="number-input-group">
                        <button
                          type="button"
                          className="number-btn decrease"
                          onClick={() => handleServingsChange('decrease')}
                          disabled={formData.servings <= 1}
                        >
                          <Minus size={16} />
                        </button>
                        <input
                          type="number"
                          value={formData.servings}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            servings: Math.max(1, parseInt(e.target.value) || 2)
                          }))}
                          className="number-input"
                          min="1"
                          required
                        />
                        <button
                          type="button"
                          className="number-btn increase"
                          onClick={() => handleServingsChange('increase')}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ingredients */}
                <div className="form-section full-width">
                  <div className="section-header">
                    <h2 className="section-title">Ingredients *</h2>
                    <button
                      type="button"
                      className="add-ingredient-btn"
                      onClick={addIngredient}
                    >
                      <Plus size={16} />
                      Add Ingredient
                    </button>
                  </div>
                  
                  <div className="ingredients-list">
                    {formData.ingredients.map((ingredient, index) => (
                      <div key={index} className="ingredient-row">
                        <div className="ingredient-input-group">
                          <input
                            type="text"
                            placeholder="Quantity (optional)"
                            value={ingredient.quantity}
                            onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                            className="ingredient-input quantity"
                          />
                          <input
                            type="text"
                            placeholder="Unit (optional)"
                            value={ingredient.unit}
                            onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                            className="ingredient-input unit"
                          />
                          <input
                            type="text"
                            placeholder="Ingredient description *"
                            value={ingredient.description}
                            onChange={(e) => handleIngredientChange(index, 'description', e.target.value)}
                            className="ingredient-input description"
                            required
                          />
                        </div>
                        {formData.ingredients.length > 1 && (
                          <button
                            type="button"
                            className="remove-ingredient-btn"
                            onClick={() => removeIngredient(index)}
                            aria-label="Remove ingredient"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setFormData({
                      title: '',
                      source_url: '',
                      image_url: '',
                      publisher: currentUser?.name || '',
                      cooking_time: 30,
                      servings: 2,
                      ingredients: [
                        { quantity: '', unit: '', description: '' }
                      ]
                    });
                    setError('');
                    setSuccess(false);
                  }}
                  disabled={loading}
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader className="spinner" />
                      Adding Recipe...
                    </>
                  ) : (
                    'Add Recipe'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddRecipe;