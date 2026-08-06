import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const DriverDocsPage = () => {
  const [docs, setDocs] = useState({
    idCard: false, license: false, carLicense: false, insurance: false
  });

  const handleUpload = (docName) => {
    setDocs({...docs, [docName]: true});
  };

  const handleSubmit = () => {
    const userData = JSON.parse(localStorage.getItem('wasoolUser') || '{}');
    userData.docsUploaded = true;
    localStorage.setItem('wasoolUser', JSON.stringify(userData));
    alert('✅ تم رفع المستندات وإرسالها للمراجعة!');
    window.location.href = '/dashboard';
  };

  const allUploaded = Object.values(docs).every(v => v === true);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <Link to="/dashboard" style={styles.backBtn}>← رجوع</Link>
        <h2 style={styles.title}>📄 مستندات السائق</h2>
        <p style={styles.subtitle}>يرجى رفع جميع المستندات المطلوبة</p>

        {[
          {key: 'idCard', label: 'الهوية الوطنية'},
          {key: 'license', label: 'رخصة القيادة'},
          {key: 'carLicense', label: 'استمارة السيارة'},
          {key: 'insurance', label: 'وثيقة التأمين'}
        ].map(item => (
          <div key={item.key} style={styles.docItem}>
            <span>{docs[item.key] ? '✅' : '⏳'}</span>
            <span style={styles.docName}>{item.label}</span>
            {!docs[item.key] ? (
              <button style={styles.uploadBtn} onClick={() => handleUpload(item.key)}>رفع 📤</button>
            ) : (
              <span style={styles.uploaded}>مرفوع ✅</span>
            )}
          </div>
        ))}

        <div style={styles.progressBox}>
          <p>نسبة الاكتمال</p>
          <div style={styles.progressBar}>
            <div style={{...styles.progressFill, width: `${(Object.values(docs).filter(v=>v).length / 4) * 100}%`}}></div>
          </div>
          <p style={styles.progressText}>{Object.values(docs).filter(v=>v).length} من ٤ مستندات</p>
        </div>

        <button 
          style={{...styles.submitBtn, opacity: allUploaded ? 1 : 0.6}}
          onClick={allUploaded ? handleSubmit : undefined}
        >
          إرسال للمراجعة 📩
        </button>
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
  docItem: { display: 'flex', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '10px', marginBottom: '10px', gap: '10px' },
  docName: { flex: 1, fontSize: '14px', fontWeight: '500' },
  uploadBtn: { padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' },
  uploaded: { fontSize: '12px', color: '#10b981', fontWeight: '600' },
  progressBox: { marginTop: '20px', marginBottom: '20px' },
  progressBar: { height: '10px', background: '#e5e7eb', borderRadius: '5px', overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)' },
  progressText: { textAlign: 'center', fontSize: '12px', color: '#666', marginTop: '5px' },
  submitBtn: { width: '100%', padding: '14px', background: '#111827', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }
};

export default DriverDocsPage;