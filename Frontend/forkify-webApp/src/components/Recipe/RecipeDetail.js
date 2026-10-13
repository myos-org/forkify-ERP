import React, { useState, useEffect, useRef } from 'react';
import { Clock, Users, ExternalLink, Plus, Minus, Trash2 } from 'lucide-react';
import BookmarkButton from './BookmarkButton';

function RecipeDetail({ recipe, onToggleBookmark, showRemoveOption = false }) {
  const [servings, setServings] = useState(recipe.servings || 1);
  const [hasOverflow, setHasOverflow] = useState(false);
  const wrapperRef = useRef(null);
  const contentRef = useRef(null);
  
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];

  useEffect(() => {
    const checkOverflow = () => {
      if (wrapperRef.current && contentRef.current) {
        const wrapperWidth = wrapperRef.current.clientWidth;
        const contentWidth = contentRef.current.scrollWidth;
        setHasOverflow(contentWidth > wrapperWidth);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    
    return () => window.removeEventListener('resize', checkOverflow);
  }, [recipe]);

  const increaseServings = () => {
    const newServings = servings + 1;
    setServings(newServings);
  };

  const decreaseServings = () => {
    if (servings > 1) {
      setServings(servings - 1);
    }
  };

  const formatQuantity = (quantity) => {
    if (quantity === undefined || quantity === null) return '';
    
    const num = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
    
    if (isNaN(num)) return '';
    
    if (num === 0.25) return '¼';
    if (num === 0.33) return '⅓';
    if (num === 0.5) return '½';
    if (num === 0.66) return '⅔';
    if (num === 0.75) return '¾';
    
    if (num % 1 === 0) return num.toString();
    
    return Math.round(num * 100) / 100;
  };

  const handleRemoveBookmark = () => {
    if (onToggleBookmark) {
      onToggleBookmark(recipe);
    }
  };

  if (!recipe) {
    return (
      <div className="recipe-detail-wrapper">
        <div className="recipe-detail">
          <div className="empty-state">
            <div className="empty-icon">🍽️</div>
            <p className="text-xl">Select a recipe to view</p>
            <p>Choose a recipe from the list</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={wrapperRef}
      className={`recipe-detail-wrapper ${hasOverflow ? 'has-overflow' : ''}`}
    >
      <div className="recipe-detail" ref={contentRef}>
        <div className="recipe-header">
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="recipe-image"
            loading="lazy"
          />
          <div className="recipe-overlay"></div>
          <h1 className="recipe-title">
            {recipe.title}
          </h1>
        </div>

        <div className="recipe-content-wrapper">
          <div className="recipe-meta">
            <div className="meta-container">
              <div className="meta-info">
                <div className="meta-item">
                  <Clock className="meta-icon" />
                  <span>{recipe.cooking_time} min</span>
                </div>
                <div className="servings-control">
                  <div className="servings-label">
                    <Users className="meta-icon" />
                    <span>{servings} servings</span>
                  </div>
                  <div className="servings-buttons">
                    <button
                      onClick={decreaseServings}
                      className="servings-button"
                      aria-label="Decrease servings"
                      disabled={servings <= 1}
                    >
                      <Minus size={16} />
                    </button>
                    <button
                      onClick={increaseServings}
                      className="servings-button"
                      aria-label="Increase servings"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="recipe-actions">
                {showRemoveOption ? (
                  <button
                    onClick={handleRemoveBookmark}
                    className="remove-button"
                    aria-label="Remove from bookmarks"
                  >
                    <Trash2 className="remove-icon" />
                    <span className="remove-text">Remove</span>
                  </button>
                ) : (
                  <BookmarkButton
                    isBookmarked={recipe.isBookmarked}
                    onClick={() => onToggleBookmark && onToggleBookmark(recipe)}
                    size="medium"
                  />
                )}
              </div>
            </div>

            <div className="recipe-publisher">
              <div className="publisher-info">
                Recipe by <span className="publisher-name">{recipe.publisher}</span>
              </div>
              {recipe.source_url && (
                <a
                  href={recipe.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="source-link"
                  aria-label={`View original recipe on ${recipe.publisher}`}
                >
                  <span>View Original Recipe</span>
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>

          <div className="recipe-section">
            <h2>Ingredients</h2>
            <div className="ingredients-header">
              <span className="servings-note">
                For {servings} serving{servings !== 1 ? 's' : ''}
              </span>
              {servings !== (recipe.servings || 1) && (
                <span className="servings-adjusted">
                  (Adjusted from original {recipe.servings} servings)
                </span>
              )}
            </div>
            <div className="ingredients-grid">
              {ingredients.length === 0 ? (
                <p className="no-ingredients">No ingredients listed for this recipe.</p>
              ) : (
                ingredients.map((ingredient, index) => (
                  <div
                    key={index}
                    className="ingredient-item"
                  >
                    <div className="ingredient-dot"></div>
                    <p className="ingredient-text">
                      {ingredient.quantity !== undefined && ingredient.quantity !== null && (
                        <span className="quantity">{formatQuantity(ingredient.quantity)} </span>
                      )}
                      {ingredient.unit && ingredient.unit.trim() && (
                        <span className="unit">{ingredient.unit} </span>
                      )}
                      <span>{ingredient.description}</span>
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="recipe-section">
            <h2>How to cook it</h2>
            <p className="directions-text">
              This recipe was carefully designed and tested by{' '}
              <span className="highlight-publisher">{recipe.publisher}</span>.
              For detailed step-by-step instructions, visit their website.
            </p>
            <div className="direction-actions">
              <a
                href={recipe.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="directions-button primary"
              >
                <span>View Full Directions</span>
                <ExternalLink className="external-icon" />
              </a>
              <button
                onClick={() => window.open(recipe.source_url, '_blank')}
                className="directions-button secondary"
                aria-label="Open recipe in new tab"
              >
                <span>Open in New Tab</span>
                <svg className="arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecipeDetail;