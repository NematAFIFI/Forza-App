import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const RegisterPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    accountType: 'راكب'
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmitData = (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone) {
      alert('⚠️ الرجاء إدخال الاسم ورقم الجوال');
      return;
    }
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedCode(code);
    alert(`✅ كود التحقق: ${code}`);
    setStep(2);
  };

  const handleVerifyCode = (e) => {
    e.preventDefault();
    if (verificationCode === generatedCode) {
      // حفظ بيانات المستخدم
      localStorage.setItem('wasoolUser', JSON.stringify({
        name: formData.fullName,
        phone: formData.phone,
        type: formData.accountType
      }));
      
      // ✅ الانتقال مباشرة لصفحة التطبيق بدون رسائل
      window.location.href = '/dashboard';
    } else {
      alert('❌ الكود غير صحيح! أعد المحاولة');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <Link to="/" style={styles.backButton}>← الرجوع للرئيسية</Link>

        {step === 1 && (
          <>
            <h1 style={styles.title}>إنشاء حساب جديد</h1>
            <p style={styles.subtitle}>أكمل بياناتك وابدأ رحلتك مع وَصُول 🚗</p>
            <form style={styles.form} onSubmit={handleSubmitData}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>الاسم الكامل</label>
                <input type="text" name="fullName" style={styles.input} placeholder="أدخل اسمك الكامل" value={formData.fullName} onChange={handleChange} required />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>رقم الجوال</label>
                <input type="tel" name="phone" style={styles.input} placeholder="05XXXXXXXX" value={formData.phone} onChange={handleChange} required />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>نوع الحساب</label>
                <select name="accountType" style={styles.input} value={formData.accountType} onChange={handleChange}>
                  <option>راكب</option>
                  <option>سائق</option>
                </select>
              </div>
              <button type="submit" style={styles.button}>إرسال كود التحقق ✅</button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h1 style={styles.title}>تحقق من رقمك ✉️</h1>
            <p style={styles.subtitle}>أدخل الكود المكون من 4 أرقام</p>
            <form style={styles.form} onSubmit={handleVerifyCode}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>كود التحقق</label>
                <input type="text" style={styles.input} placeholder="أدخل الكود هنا" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} maxLength={4} required />
              </div>
              <button type="submit" style={styles.button}>تأكيد والدخول 🚀</button>
              <button type="button" style={styles.secondaryButton} onClick={() => setStep(1)}>
                ⬅️ تعديل البيانات
              </button>
            </form>
          </>
        )}
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
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '20px'
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
    fontSize: '22px',
    textAlign: 'center',
    letterSpacing: '8px',
    fontWeight: 'bold'
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
  },
  secondaryButton: {
    marginTop: '5px',
    padding: '12px',
    background: 'transparent',
    color: '#3b82f6',
    border: '2px solid #3b82f6',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};

export default RegisterPage;