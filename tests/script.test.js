import { describe, expect, test } from 'vitest';
import { showToast } from '../script.js';

describe('script tests', () => {
  test('creates toast element', () => {
    // Arrange
    document.body.innerHTML = '';

    // Act
    showToast('Test');

    // Assert
    const toast = document.querySelector('.toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toBe('Test');
  });
});
