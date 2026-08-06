import React, { useState } from 'react';

const ComplaintPage = () => {
  const [type, setType] = useState('شكوى');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`✅ تم إرسال ${type} بنجاح!\nسنرد عليك في أسرع وقت ممكن.`);
    setMessage('');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <button style={styles.backBtn} onClick={() => window.location.href='/profile'}>← رجوع</button>
        <h2 style={styles.title}>📝 الشكاوي والمقترحات</h2>

        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label>النوع</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={styles.input}>
              <option>شكوى</option>
              <option>مقترح</option>
              <option>استفسار</option>
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label>تفاصيل {type}</label>
            <textarea
              style={styles.textarea}
              placeholder="اكتب تفاصيل ما تريد…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>

          <button type="submit" style={styles.btn}>إرسال ✅</button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {minHeight: '100vh', background: 'linear-gradient(135deg, #0c1445, #3949ab)', padding: '20px', fontFamily: 'Cairo, sans-serif'},
  card: {background: '#fff', borderRadius: '24px', padding: '30px', maxWidth: '420px', margin: '0 auto'},
  backBtn: {border: 'none', background: 'none', fontSize: '16px', color: '#3b82f6', cursor: 'pointer', marginBottom: '15px'},
  title: {fontSize: '22px', fontWeight: 'bold', textAlign: 'center', marginBottom: '25px'},
  inputGroup: {marginBottom: '15px'},
  label: {display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px'},
  input: {width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '14px'},
  textarea: {width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', minHeight: '120px', resize: 'vertical'},
  btn: {width: '100%', padding: '14px', background: 'linear-gradient(135deg, #3b82f6, #7c3aed)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px'}
};

export default ComplaintPage;