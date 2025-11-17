// src/components/GoogleTranslate.jsx
import { useEffect } from 'react';

const GoogleTranslate = () => {
  useEffect(() => {
    // Tránh load lại script nếu đã tồn tại
    if (document.getElementById('google-translate-script')) return;

    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);

    // Định nghĩa callback sau khi script được load
    window.googleTranslateElementInit = () => {
      if (window.google && window.google.translate) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'vi',
            includedLanguages: 'vi,en',
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
          },
          'google_translate_element'
        );
      }
    };
  }, []);

  return (
    <div id="google_translate_element" style={{ float: 'right', marginBottom: '1rem' }}></div>
  );
};

export default GoogleTranslate;
