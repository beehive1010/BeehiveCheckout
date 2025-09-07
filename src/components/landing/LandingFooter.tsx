import { useI18n } from '../../contexts/I18nContext';

export function LandingFooter() {
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-br from-black via-slate-900 to-black border-t border-white/10 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-honey/5 rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-yellow-400/5 rounded-full mix-blend-multiply filter blur-3xl"></div>
        
        {/* Floating Particles */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-honey/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 md:py-16">
        {/* Newsletter Section */}
        <div className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-xl rounded-3xl border border-white/10 p-6 md:p-8 mb-8 md:mb-16">
          <div className="text-center max-w-2xl mx-auto">
            <h3 className="text-3xl font-bold bg-gradient-to-r from-honey via-yellow-300 to-amber-400 bg-clip-text text-transparent mb-4">
              {t('footer.newsletter.title')}
            </h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              {t('footer.newsletter.description')}
            </p>
            
            {/* Newsletter Form */}
            <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
              <input
                type="email"
                placeholder={t('footer.newsletter.placeholder')}
                className="flex-1 px-6 py-4 bg-black/50 border border-white/20 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-honey/50 focus:ring-2 focus:ring-honey/20 transition-all duration-300"
                data-testid="newsletter-email-input"
              />
              <button
                className="px-8 py-4 bg-gradient-to-r from-honey to-yellow-400 text-black font-bold rounded-full hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-honey/25"
                data-testid="newsletter-subscribe-button"
              >
                {t('footer.newsletter.button')}
              </button>
            </div>
            
            <p className="text-sm text-gray-500 mt-4">
              {t('footer.newsletter.disclaimer')}
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Logo and Brand */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-honey/20 rounded-full blur-xl"></div>
                <img 
                  src="/image/BCC.png" 
                  alt="Beehive Logo" 
                  className="relative w-12 h-12 object-contain filter brightness-110"
                />
              </div>
              <div>
                <h4 className="text-xl font-bold bg-gradient-to-r from-honey to-yellow-400 bg-clip-text text-transparent">
                  Beehive
                </h4>
                <p className="text-sm text-gray-400">
                  {t('footer.brand.tagline')}
                </p>
              </div>
            </div>
            
            {/* Social Media Links */}
            <div className="flex items-center gap-6">
              {[
                { icon: '🐦', name: 'Twitter', href: '#' },
                { icon: '💬', name: 'Discord', href: '#' },
                { icon: '📱', name: 'Telegram', href: '#' },
                { icon: '🎥', name: 'YouTube', href: '#' }
              ].map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className="group relative w-12 h-12 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10 hover:border-honey/50 transition-all duration-300 hover:scale-110"
                  data-testid={`social-link-${social.name.toLowerCase()}`}
                >
                  <span className="text-xl group-hover:scale-110 transition-transform duration-300">
                    {social.icon}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-honey/0 to-honey/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </a>
              ))}
            </div>
            
            {/* Copyright */}
            <div className="text-center md:text-right">
              <p className="text-gray-400 text-sm">
                © {currentYear} Beehive. {t('footer.copyright.rights')}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                {t('footer.copyright.blockchain')}
              </p>
            </div>
          </div>
        </div>

        {/* Back to Top Button */}
        <div className="text-center mt-4 md:mt-8">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="group relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-honey/20 to-yellow-400/20 backdrop-blur-sm rounded-full border border-honey/30 hover:border-honey/50 transition-all duration-300 hover:scale-105"
            data-testid="back-to-top-button"
          >
            <span className="text-sm font-medium text-honey group-hover:text-yellow-300 transition-colors duration-300">
              {t('footer.backToTop')}
            </span>
            <span className="text-lg transform group-hover:-translate-y-1 transition-transform duration-300">
              ⬆️
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}