/* Tailwind CDN config for Yedi Cihan frontend prototype */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        deep: '#021D32',
        navy: '#073452',
        soft: '#0B4568',
        burgundy: '#A5243D',
        burgundyDark: '#7D1830',
        gold: '#D8AA55',
        offwhite: '#F7F4EF',
        textdark: '#17212B',
        muted: '#6B7280',
        ice: '#CDE0EA'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        soft: '0 18px 40px -20px rgba(0,0,0,.18)',
        lift: '0 24px 70px -36px rgba(2,29,50,.45)'
      }
    }
  }
}
