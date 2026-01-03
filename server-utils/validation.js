/**
 * Input Validation Utilities [SECURITY]
 * Basic validation middleware for API endpoints
 */

/**
 * Validate email format
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate required fields
 */
export function validateRequired(body, fields) {
  const missing = [];
  for (const field of fields) {
    if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
      missing.push(field);
    }
  }
  return missing;
}

/**
 * Sanitize string input (basic XSS prevention)
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate product data
 */
export function validateProduct(product) {
  const errors = [];
  
  if (!product.title || product.title.trim().length < 3) {
    errors.push('Title must be at least 3 characters');
  }
  if (!product.price || isNaN(product.price) || product.price <= 0) {
    errors.push('Valid price is required');
  }
  if (!product.location || product.location.trim().length < 3) {
    errors.push('Location is required');
  }
  if (product.description && product.description.length > 5000) {
    errors.push('Description too long (max 5000 characters)');
  }
  
  return errors;
}

/**
 * Validate garage sale data
 */
export function validateGarageSale(sale) {
  const errors = [];
  
  if (!sale.title || sale.title.trim().length < 3) {
    errors.push('Title must be at least 3 characters');
  }
  if (!sale.address || sale.address.trim().length < 5) {
    errors.push('Valid address is required');
  }
  if (!sale.start_date) {
    errors.push('Start date is required');
  }
  if (!sale.start_time) {
    errors.push('Start time is required');
  }
  if (!sale.end_time) {
    errors.push('End time is required');
  }
  
  return errors;
}

/**
 * Validation middleware factory
 */
export function validate(schema) {
  return (req, res, next) => {
    const errors = schema(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        errors 
      });
    }
    next();
  };
}


