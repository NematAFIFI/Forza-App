import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('سائق');

  const handleRegister = (e) => {
    e.preventDefault();
    const userData = {
      name,
      phone,
      type,
      isApproved: type === 'راكب' ? true : false,
      docsUploaded: false
    };
    localStorage.setItem('wasoolUser', JSON.stringify(userData));
    
    if (type === 'سائق') {
      alert('⚠️ يجب رفع المستندات المطلوبة أولاً لتفعيل حسابك!');
      window.location.href = '/driver-docs';
    } else {
      window.location.href = '/dashboard';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <Link to="/" style={styles.backLink}>← الرجوع للرئيسية</Link>
        
        <h1 style={styles.title}>إنشاء حساب جديد</h1>
        <p style={styles.subtitle}>أكمل بياناتك وابدأ رحلتك مع وَصُول 🚗</p>

        <form onSubmit={handleRegister}>
          <div style={styles.inputGroup}>
            <label>الاسم الكامل</label>
            <input
              type="text"
              style={styles.input}
              placeholder="أدخل اسمك الكامل"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label>رقم الجوال</label>
            <input
              type="tel"
              style={styles.input}
              placeholder="05XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label>نوع الحساب</label>
            <select
              style={styles.select}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="سائق">سائق</option>
              <option value="راكب">راكب</option>
            </select>
          </div>

          {type === 'سائق' && (
            <div style={styles.warningBox}>
              ⚠️ ملاحظة: بصفتك سائقاً، يجب رفع المستندات المطلوبة أولاً لتفعيل حسابك.
            </div>
          )}

          <button type="submit" style={styles.btn}>إرسال كود التحقق ✅</button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0c1445, #3949ab)',
    padding: '20px',
    fontFamily: 'Cairo, sans-serif'
  },
  card: {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '24px',
    padding: '35px 25px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center'
  },
  backLink: {
    display: 'inline-block',
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '14px',
    marginBottom: '15px'
  },
  title: { fontSize: '26px', color: '#1a237e', marginBottom: '8px' },
  subtitle: { color: '#64748b', marginBottom: '25px' },
  inputGroup: { marginBottom: '15px', textAlign: 'right' },
  label: { display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px', color: '#374151' },
  input: { width: '100%', padding: '14px 12px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '15px', boxSizing: 'border-box' },
  select: { width: '100%', padding: '14px 12px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '15px', background: '#fff' },
  warningBox: { background: '#fef3c7', color: '#92400e', padding: '12px', borderRadius: '10px', fontSize: '13px', marginBottom: '15px', textAlign: 'right' },
  btn: { width: '100%', padding: '15px', background: 'linear-gradient(90deg, #3b82f6, #7c3aed)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', marginTop: '5px' }
};

export default RegisterPage;