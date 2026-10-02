import { describe, expect, it } from 'vitest';
import {
  adminFeedbackQuerySchema,
  adminUsersQuerySchema,
  updateFeedbackStatusSchema,
  updateUserStatusSchema,
} from '../../src/validators/adminValidators.js';

describe('admin validators', () => {
  describe('adminUsersQuerySchema', () => {
    it('applies pagination defaults', () => {
      expect(adminUsersQuerySchema.parse({})).toMatchObject({ page: 1, pageSize: 20 });
    });

    it('accepts search/role/isActive filters', () => {
      const parsed = adminUsersQuerySchema.parse({ search: 'ada', role: 'admin', isActive: 'false' });
      expect(parsed).toMatchObject({ search: 'ada', role: 'admin', isActive: 'false' });
    });

    it('rejects unknown roles, bad isActive values and unknown keys', () => {
      expect(() => adminUsersQuerySchema.parse({ role: 'superadmin' })).toThrow();
      expect(() => adminUsersQuerySchema.parse({ isActive: 'yes' })).toThrow();
      expect(() => adminUsersQuerySchema.parse({ unknownFilter: 'x' })).toThrow();
    });
  });

  describe('updateUserStatusSchema', () => {
    it('accepts a boolean toggle', () => {
      expect(updateUserStatusSchema.parse({ isActive: false })).toEqual({ isActive: false });
    });

    it('rejects non-booleans, empty bodies and unknown keys', () => {
      expect(() => updateUserStatusSchema.parse({ isActive: 'false' })).toThrow();
      expect(() => updateUserStatusSchema.parse({})).toThrow();
      expect(() => updateUserStatusSchema.parse({ isActive: true, role: 'user' })).toThrow();
    });
  });

  describe('adminFeedbackQuerySchema', () => {
    it('accepts status/type/search filters', () => {
      expect(adminFeedbackQuerySchema.parse({ status: 'open', type: 'complaint' })).toMatchObject({
        status: 'open',
        type: 'complaint',
      });
    });

    it('rejects unknown statuses and unknown keys', () => {
      expect(() => adminFeedbackQuerySchema.parse({ status: 'bogus' })).toThrow();
      expect(() => adminFeedbackQuerySchema.parse({ userId: 'anything' })).toThrow();
    });
  });

  describe('updateFeedbackStatusSchema', () => {
    it('accepts a status-only or note-only update', () => {
      expect(updateFeedbackStatusSchema.parse({ status: 'resolved' })).toEqual({ status: 'resolved' });
      expect(updateFeedbackStatusSchema.parse({ adminNote: null })).toEqual({ adminNote: null });
    });

    it('rejects empty bodies, bad statuses and overlong notes', () => {
      expect(() => updateFeedbackStatusSchema.parse({})).toThrow();
      expect(() => updateFeedbackStatusSchema.parse({ status: 'bogus' })).toThrow();
      expect(() => updateFeedbackStatusSchema.parse({ adminNote: 'x'.repeat(1001) })).toThrow();
    });
  });
});
