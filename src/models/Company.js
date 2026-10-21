/**
 * @file Company.js
 * @description Data access layer for Company Profile information.
 */

const { query, inMemoryStore } = require('../config/database');

class CompanyModel {
  static async get() {
    let company = null;
    const rows = await query('SELECT * FROM `company_profile` LIMIT 1');
    if (rows && rows.length > 0) {
      company = rows[0];
    } else {
      company = inMemoryStore.company_profile[0] || null;
    }

    if (company) {
      const addr = company.address || [company.address_line1, company.address_line2, company.city, company.state, company.postal_code].filter(Boolean).join(', ');
      return {
        ...company,
        address: addr,
        mobile_number: company.mobile_number || company.phone || ''
      };
    }

    return null;
  }

  static async update(data) {
    const existing = await this.get();
    if (!existing) {
      const insertSql = `
        INSERT INTO \`company_profile\` (
          company_name, tagline, address_line1, address_line2, city, state, postal_code,
          country, email, phone, website, pan_number, gst_number, currency_symbol, currency_code,
          authorized_signatory_name, authorized_signatory_title, logo_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const result = await query(insertSql, [
        data.company_name, data.tagline || '', data.address_line1, data.address_line2 || '',
        data.city, data.state, data.postal_code, data.country || 'India', data.email,
        data.phone, data.website || '', data.pan_number || '', data.gst_number || '',
        data.currency_symbol || '₹', data.currency_code || 'INR',
        data.authorized_signatory_name || 'HR Manager',
        data.authorized_signatory_title || 'Authorized Signatory',
        data.logo_url || ''
      ]);
      return this.get();
    }

    const updateSql = `
      UPDATE \`company_profile\` SET
        company_name = ?, tagline = ?, address_line1 = ?, address_line2 = ?,
        city = ?, state = ?, postal_code = ?, country = ?, email = ?,
        phone = ?, website = ?, pan_number = ?, gst_number = ?,
        currency_symbol = ?, currency_code = ?, authorized_signatory_name = ?,
        authorized_signatory_title = ?, logo_url = ?
      WHERE id = ?
    `;

    await query(updateSql, [
      data.company_name !== undefined ? data.company_name : existing.company_name,
      data.tagline !== undefined ? data.tagline : existing.tagline,
      data.address_line1 !== undefined ? data.address_line1 : existing.address_line1,
      data.address_line2 !== undefined ? data.address_line2 : existing.address_line2,
      data.city !== undefined ? data.city : existing.city,
      data.state !== undefined ? data.state : existing.state,
      data.postal_code !== undefined ? data.postal_code : existing.postal_code,
      data.country !== undefined ? data.country : existing.country,
      data.email !== undefined ? data.email : existing.email,
      data.phone !== undefined ? data.phone : existing.phone,
      data.website !== undefined ? data.website : existing.website,
      data.pan_number !== undefined ? data.pan_number : existing.pan_number,
      data.gst_number !== undefined ? data.gst_number : existing.gst_number,
      data.currency_symbol !== undefined ? data.currency_symbol : existing.currency_symbol,
      data.currency_code !== undefined ? data.currency_code : existing.currency_code,
      data.authorized_signatory_name !== undefined ? data.authorized_signatory_name : existing.authorized_signatory_name,
      data.authorized_signatory_title !== undefined ? data.authorized_signatory_title : existing.authorized_signatory_title,
      data.logo_url !== undefined ? data.logo_url : existing.logo_url,
      existing.id
    ]);

    // Also update in-memory cache if applicable
    if (inMemoryStore.company_profile.length > 0) {
      Object.assign(inMemoryStore.company_profile[0], data);
    }

    return this.get();
  }
}

module.exports = CompanyModel;
