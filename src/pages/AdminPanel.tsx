import React from 'react';
import { Link } from 'react-router-dom';

const AdminPanel = () => {
  const userData = localStorage.getItem('wasoolUser');
  const user = userData ? JSON.parse(userData) : null;

  if (!user || (user.name !== 'مدير' && user.name !== 'المالك')) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={{color: '#dc2626'}}>⛔ غير مصرح لك بالدخول</h2>
          <p style={{margin: '20px 0', color: '#666'}}>هذه الصفحة خاصة بمالك التطبيق فقط</p>
          <Link to="/dashboard" style={styles.logout}>الرجوع للرئيسية</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <Link to="/dashboard" style={styles.backBtn}>← رجوع</Link>
        
        <h2 style={styles.title}>⚙️ لوحة تحكم المالك</h2>
        <p style={styles.subtitle}>تحكم بنسبة التطبيق وإعدادات النظام</p>

        <div style={styles.section}>
          <h3 style={styles.secTitle}>💰 نسبة التطبيق من الرحلات</h3>
          <div style={styles.inputRow}>
            <label>نسبة وَصُول:</label>
            <input type="number" defaultValue={15} style={styles.input} />
            <span>٪</span>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.secTitle}>📊 إحصائيات النظام</h3>
          <div style={styles.statItem}><span>إجمالي الأرباح اليوم</span><strong>١,٢٥٠ ريال</strong></div>
          <div style={styles.statItem}><span>إجمالي الأرباح الشهرية</span><strong>٢٨,٤٠٠ ريال</strong></div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #0c1445, #3949ab)', padding: '20px', fontFamily: 'Cairo, sans-serif' },
  card: { background: '#fff', borderRadius: '24px', padding: '30px', maxWidth: '420px', margin: '0 auto' },
  backBtn: { display: 'inline-block', color: '#3b82f6', textDecoration: 'none', fontSize: '16px', marginBottom: '15px' },
  title: { fontSize: '22px', fontWeight: 'bold', textAlign: 'center', marginBottom: '5px' },
  subtitle: { textAlign: 'center', color: '#666', marginBottom: '25px', fontSize: '14px' },
  section: { marginBottom: '25px' },
  secTitle: { fontSize: '15px', fontWeight: 'bold', marginBottom: '12px' },
  inputRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  input: { width: '60px', padding: '8px', border: '1px solid #ccc', borderRadius: '8px', textAlign: 'center' },
  statItem: { display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f0f4ff', borderRadius: '10px', fontSize: '14px', marginBottom: '8px' },
  logout: { display: 'block', textAlign: 'center', padding: '12px', background: '#fee2e2', color: '#b91c1c', textDecoration: 'none', borderRadius: '10px', fontWeight: '600' }
};

export default AdminPanel;