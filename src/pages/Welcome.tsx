import React from 'react';
import { Link } from 'react-router-dom';

const WelcomePage = () => {
  return (
    <>
      <div className="welcome-bg"></div>
      <div className="welcome-container">
        <div className="welcome-card">
          <div className="logo-emoji">🚗</div>
          
          <h1 className="app-title">وَصُول</h1>
          
          <h2 className="welcome-heading">أهلاً وسهلاً بكَ في رحلتك الجديدة ✨</h2>
          
          <p className="welcome-desc">
            حيثُ الأمانُ عنوانُنا، والراحةُ طريقُنا، والوصولُ غايتُنا.
            نُرافقُكَ في كلِّ رحلةٍ لتبدأَ وتصلَ بكلِّ ثقةٍ واطمئنان.
          </p>

          <div className="button-group">
            <Link to="/register" className="welcome-btn btn-primary">
              🚀 ابدأ رحلتك الآن
            </Link>
            <Link to="/login" className="welcome-btn btn-secondary">
              🔐 لدي حساب بالفعل — سجّل دخولك
            </Link>
          </div>

          <p className="footer-text">
            نوصلك بأمانٍ… وسرعةٍ… وراحةٍ تامة 💜
          </p>
        </div>
      </div>
    </>
  );
};

export default WelcomePage;