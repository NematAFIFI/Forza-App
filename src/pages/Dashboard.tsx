import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const userData = localStorage.getItem('wasoolUser');
  const user = userData ? JSON.parse(userData) : null;

  if (!user) {
    window.location.href = '/';
    return null;
  }

  if (user.type === 'سائق' && !user.isApproved) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={{color: '#d97706', fontSize: '22px'}}>⏳ حسابك بانتظار التفعيل</h2>
          <p style={{margin: '15px 0', color: '#4b5563'}}>يجب رفع المستندات أولاً لتفعيل حسابك.</p>
          <Link to="/driver-docs" style={styles.menuItem}>📄 اضغط هنا لرفع المستندات</Link>
          {user.docsUploaded && (
            <div style={{background: '#dcfce7', padding: '12px', borderRadius: '10px', color: '#166534', marginTop: '15px'}}>
              ✅ تم رفع المستندات! بانتظار المراجعة.
            </div>
          )}
          <button style={styles.logout} onClick={() => { localStorage.removeItem('wasoolUser'); window.location.href='/'; }}>تسجيل الخروج</button>
        </div>
      </div>
    );
  }

  const isAdmin = user.name === 'مدير' || user.name === 'المالك';
  const isDriver = user.type === 'سائق';
  const isRider = user.type === 'راكب';

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.welcome}>مرحباً بك يا {user.name} 🎉</h1>
        <p style={styles.info}>صفحة {user.type} الرئيسية</p>
        
        <div style={styles.infoBox}>
          <p><strong>رقم الجوال:</strong> {user.phone}</p>
          <p><strong>نوع الحساب:</strong> {user.type}</p>
          {isDriver && <p><strong>الحالة:</strong> 🟢 حساب مُفعل وجاهز للعمل</p>}
        </div>

        <div style={styles.menu}>
          {isRider && <Link to="/ride" style={styles.menuItem}>🚗 طلب رحلة جديدة</Link>}
          {isDriver && (
            <><div style={styles.menuItem}>📥 استقبال الرحلات</div><Link to="/driver-docs" style={styles.menuItem}>📄 مستنداتي</Link></>
          )}
          <Link to="/wallet" style={styles.menuItem}>💰 المحفظة</Link>
          <Link to="/profile" style={styles.menuItem}>👤 حسابي الشخصي</Link>
          <Link to="/settings" style={styles.menuItem}>⚙️ الإعدادات</Link>
          <Link to="/support" style={styles.menuItem}>📞 الدعم الفني</Link>
          {isAdmin && <Link to="/admin" style={{...styles.menuItem, background: '#fef3c7'}}>⚙️ لوحة تحكم المالك</Link>}
        </div>

        <button style={styles.logout} onClick={() => { localStorage.removeItem('wasoolUser'); window.location.href='/'; }}>تسجيل الخروج</button>
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0c1445 0%, #3949ab 100%)', padding: '20px', fontFamily: 'Cairo, sans-serif' },
  card: { background: 'rgba(255,255,255,0.95)', borderRadius: '24px', padding: '35px 25px', maxWidth: '400px', width: '100%', textAlign: 'center' },
  welcome: { fontSize: '26px', color: '#1a237e', marginBottom: '8px' },
  info: { color: '#64748b', marginBottom: '20px' },
  infoBox: { background: '#f0f4ff', padding: '15px', borderRadius: '12px', marginBottom: '20px', textAlign: 'right' },
  menu: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' },
  menuItem: { padding: '14px', background: '#eff6ff', borderRadius: '10px', color: '#1e40af', fontWeight: '600', textDecoration: 'none' },
  logout: { padding: '12px 30px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }
};

export default Dashboard;