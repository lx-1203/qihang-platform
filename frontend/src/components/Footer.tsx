import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Globe, ChevronDown, ChevronUp, ArrowUp, Mail, MessageCircle, Share2, Twitter } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t, i18n } = useTranslation();
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const languages = [
    { code: 'zh', name: t('footer.lang_zh') },
    { code: 'en', name: t('footer.lang_en') },
    { code: 'ja', name: t('footer.lang_ja') },
  ];
  const currentLangName = languages.find(lang => lang.code === i18n.language)?.name || t('footer.lang_zh');

  // 处理滚动显示回到顶部按钮
  useEffect(() => {
    let timeoutId: number;

    const handleScroll = () => {
      // 节流处理滚动事件
      if (timeoutId) {
        window.cancelAnimationFrame(timeoutId);
      }

      timeoutId = window.requestAnimationFrame(() => {
        if (window.scrollY > 300) {
          setShowBackToTop(true);
        } else {
          setShowBackToTop(false);
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutId) window.cancelAnimationFrame(timeoutId);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const toggleMobileExpand = () => {
    setIsMobileExpanded(!isMobileExpanded);
  };

  const footerLinks = [
    {
      title: t('footer.about_company'),
      links: [
        { name: t('footer.about_us'), url: '/about' },
        { name: t('footer.certifications'), url: '/certifications' },
        { name: t('footer.history'), url: '/history' },
      ],
    },
    {
      title: t('footer.user_service'),
      links: [
        { name: t('footer.help_center'), url: '/help' },
        { name: t('footer.appeal'), url: '/appeal' },
        { name: t('footer.report_center'), url: '/report' },
      ],
    },
    {
      title: t('footer.legal_notice'),
      links: [
        { name: t('footer.privacy_policy'), url: '/privacy' },
        { name: t('footer.user_agreement'), url: '/terms' },
        { name: t('footer.copyright_notice'), url: '/copyright' },
      ],
    },
  ];

  const currentYear = new Date().getFullYear();
  const companyName = '您的企业名称'; // TODO: 替换为实际企业名称

  return (
    <footer className="bg-[#f9fafb] border-t border-gray-200 mt-20 relative w-full text-[#4b5563] font-sans">
      {/* 回到顶部按钮 */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-[#4b5563] hover:text-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb] md:p-3 p-4 md:right-8 right-4"
          aria-label="回到顶部"
        >
          <ArrowUp className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      )}

      {/* 底部导航内容 - 抽屉式收纳 */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* 精简样式栏 (包含Logo,简介,分类和展开按钮) */}
        <div 
          className={`flex flex-wrap items-center justify-between py-4 cursor-pointer hover:text-[#2563eb] transition-colors ${isMobileExpanded ? 'hidden' : 'flex'}`}
          onClick={toggleMobileExpand}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#2563eb] rounded flex items-center justify-center text-white font-bold text-xs">
                职
              </div>
              <span className="text-sm font-bold text-[#111827]">{t('footer.logo_demo')}</span>
            </div>
            <span className="hidden md:inline-block text-xs text-gray-500 max-w-[300px] truncate">
              {t('footer.desc')}
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-xs">
            <span className="hidden sm:inline-block">{t('footer.about_company')}</span>
            <span className="hidden sm:inline-block">{t('footer.user_service')}</span>
            <span className="hidden sm:inline-block">{t('footer.legal_notice')}</span>
            <div className="flex items-center gap-1 text-[#2563eb] font-medium ml-2">
              {isMobileExpanded ? t('footer.collapse_nav') : t('footer.expand_nav')} 
              {isMobileExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {/* 展开的详细内容 */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isMobileExpanded ? 'max-h-[1000px] opacity-100 py-8 border-t border-gray-200' : 'max-h-0 opacity-0 py-0'}`}>
          <div className="flex justify-end mb-4">
            <button 
              onClick={toggleMobileExpand}
              className="flex items-center gap-1 text-xs text-[#2563eb] font-medium cursor-pointer hover:underline focus:outline-none"
            >
              {t('footer.collapse_nav')} <ChevronUp className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* 左侧：社交媒体 */}
            <div className="col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-[#2563eb] rounded flex items-center justify-center text-white font-bold text-lg">
                  职
                </div>
                <span className="text-xl font-bold text-[#111827]">{t('footer.logo_demo')}</span>
              </div>
              <p className="text-sm leading-relaxed mb-6 text-gray-600">
                {t('footer.desc')}
              </p>
              
              {/* 社交媒体入口 */}
              <div className="flex space-x-3">
                <a href="#" className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-white hover:bg-[#e1306c] hover:border-transparent transition-all shadow-sm">
                  <Share2 className="w-4 h-4" />
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-white hover:bg-[#07c160] hover:border-transparent transition-all shadow-sm">
                  <MessageCircle className="w-4 h-4" />
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-white hover:bg-[#1da1f2] hover:border-transparent transition-all shadow-sm">
                  <Twitter className="w-4 h-4" />
                </a>
                <a href="mailto:contact@example.com" className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-800 hover:border-transparent transition-all shadow-sm">
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* 右侧：三列导航链接 */}
            <div className="col-span-1 md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-6 md:pl-12">
              {footerLinks.map((group, index) => (
                <div key={index}>
                  <h3 className="text-sm font-bold text-[#111827] mb-4">{group.title}</h3>
                  <ul className="space-y-3">
                    {group.links.map((link, linkIndex) => (
                      <li key={linkIndex}>
                        <Link to={link.url} className="text-sm text-gray-500 hover:text-[#2563eb] transition-colors">
                          {link.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 底部：版权信息与辅助功能区 (始终显示) */}
      <div className="bg-[#f3f4f6] border-t border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* 版权与备案信息 */}
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6 text-xs text-gray-500 text-center md:text-left">
              <p>©{currentYear} {companyName} {t('footer.rights_reserved')}</p>
              <div className="flex items-center gap-4">
                <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-[#2563eb] transition-colors">
                  京ICP备XXXXXXXX号-1
                </a>
                <a href="#" target="_blank" rel="noopener noreferrer" className="hover:text-[#2563eb] transition-colors">
                  京公网安备 XXXXXXXXXXXXXX号
                </a>
              </div>
            </div>

            {/* 语言切换功能 */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#2563eb] transition-colors py-1 px-2 rounded hover:bg-gray-200"
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{currentLangName}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLangMenuOpen && (
                <div className="absolute bottom-full right-0 mb-1 w-28 bg-white rounded shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        className={`block w-full text-left px-3 py-1.5 text-xs ${i18n.language === lang.code ? 'bg-blue-50 text-[#2563eb]' : 'text-gray-700 hover:bg-gray-100'}`}
                        onClick={() => {
                          i18n.changeLanguage(lang.code);
                          setIsLangMenuOpen(false);
                        }}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
