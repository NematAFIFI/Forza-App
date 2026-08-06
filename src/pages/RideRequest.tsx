import React from 'react';
import { Link } from 'react-router-dom';

const Ride = () => {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <Link to="/dashboard" style={styles.backBtn}>← رجوع</Link>
        <h2 style={styles.title}>🚗 طلب رحلة جديدة</h2>
        <p style={styles.text}>هنا نموذج إدخال نقطة الانطلاق والوجهة...</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0c1445, #3949ab)',
    padding: '20px',
    fontFamily: 'Cairo, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    background: '#fff',
    borderRadius: '24px',
    padding: '30px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center'
  },
  backBtn: {
    display: 'inline-block',
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '16px',
    marginBottom: '20px'
  },
  title: { fontSize: '22px', color: '#1a237e', marginBottom: '15px' },
  text: { color: '#64748b' }
};

export default Ride;