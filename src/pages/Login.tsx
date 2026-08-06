import React from 'react';
import { Link } from 'react-router-dom';

const LoginPage = () => {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* زر الرجوع */}
        <Link to="/" style={styles.backButton}>← الرجوع للرئيسية</Link>

        <h1 style={styles.title}>تسجيل الدخول</h1>
        <p style={styles.subtitle}>أهلاً بك مجدداً في وَصُول 🚗</p>

        <form style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>رقم الجوال</label>
            <input type="tel" style={styles.input} placeholder="أدخل رقم جوالك المسجل" />
          </div>

          <button type="submit" style={styles.button}>دخول 🔐</button>
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
    background: 'linear-gradient(135deg, #0c1445 0%, #3949ab 100%)',
    padding: '20px'
  },
  card: {
    background: 'rgba(255,255,255,0.92)',
    borderRadius: '24px',
    padding: '35px 30px',
    maxWidth: '420px',
    width: '100%',
    textAlign: 'center'
  },
  backButton: {
    display: 'inline-block',
    textAlign: 'right',
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '20px',
    alignSelf: 'flex-start'
  },
  title: {
    fontSize: '28px',
    color: '#1a237e',
    marginBottom: '8px'
  },
  subtitle: {
    color: '#64748b',
    marginBottom: '30px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  inputGroup: {
    textAlign: 'right'
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    color: '#334155',
    fontWeight: '600'
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '15px'
  },
  button: {
    marginTop: '10px',
    padding: '14px',
    background: 'linear-gradient(135deg, #3b82f6, #7c3aed)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '17px',
    fontWeight: '700',
    cursor: 'pointer'
  }
};

export default LoginPage;