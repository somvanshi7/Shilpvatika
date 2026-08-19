// Shilpvatika Quote — Form Validation

export function validateEmail(email) {
  if (!email) return 'Email is required';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return 'Please enter a valid email address';
  return null;
}

export function validatePhone(phone) {
  if (!phone) return 'Phone number is required';
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  const re = /^(\+91)?[6-9]\d{9}$/;
  if (!re.test(cleaned)) return 'Please enter a valid Indian phone number';
  return null;
}

export function validateRequired(value, fieldName) {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`;
  }
  return null;
}

export function validateLineItems(items) {
  if (!items || items.length === 0) {
    return 'At least one line item is required';
  }
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.description || !item.description.trim()) {
      return `Item ${i + 1}: Description is required`;
    }
    if (!item.qty || item.qty <= 0) {
      return `Item ${i + 1}: Quantity must be greater than 0`;
    }
    if (!item.rate || item.rate <= 0) {
      return `Item ${i + 1}: Rate must be greater than 0`;
    }
  }
  return null;
}

export function validateQuoteForm(data) {
  const errors = {};

  const nameErr = validateRequired(data.clientName, 'Client name');
  if (nameErr) errors.clientName = nameErr;

  const emailErr = validateEmail(data.email);
  if (emailErr) errors.email = emailErr;

  const phoneErr = validatePhone(data.phone);
  if (phoneErr) errors.phone = phoneErr;

  const projectErr = validateRequired(data.projectType, 'Project type');
  if (projectErr) errors.projectType = projectErr;

  const scopeErr = validateRequired(data.scopeSummary, 'Scope summary');
  if (scopeErr) errors.scopeSummary = scopeErr;

  const itemsErr = validateLineItems(data.lineItems);
  if (itemsErr) errors.lineItems = itemsErr;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
