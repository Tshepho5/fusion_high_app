const fs = require('fs');
const path = require('path');

function testParentSidebarToggle() {
    console.log('--- Testing Parent Dashboard Sidebar Toggle Implementation ---');

    const htmlPath = path.join(__dirname, '../public/dashboards/parent.html');
    const cssPath = path.join(__dirname, '../public/css/parent.css');
    const jsPath = path.join(__dirname, '../public/js/sidebar-toggle.js');

    const html = fs.readFileSync(htmlPath, 'utf8');
    const css = fs.readFileSync(cssPath, 'utf8');
    const js = fs.readFileSync(jsPath, 'utf8');

    // 1. Check parent.html elements
    const checks = [
        { desc: 'Parent Dashboard has toggle button #parent-sidebar-toggle in header', passed: html.includes('id="parent-sidebar-toggle"') },
        { desc: 'Parent Dashboard has close button #parent-sidebar-close in sidebar brand', passed: html.includes('id="parent-sidebar-close"') },
        { desc: 'Parent Dashboard includes sidebar-toggle.js script', passed: html.includes('src="/js/sidebar-toggle.js"') },
        { desc: 'Parent Dashboard includes parent.css', passed: html.includes('href="/css/parent.css"') },
        { desc: 'parent.css defines .sidebar transition', passed: css.includes('transition: margin-left') },
        { desc: 'parent.css defines .sidebar.collapsed', passed: css.includes('.sidebar.collapsed') },
        { desc: 'parent.css defines .sidebar-toggle-btn', passed: css.includes('.sidebar-toggle-btn') },
        { desc: 'parent.css defines .sidebar-close-btn', passed: css.includes('.sidebar-close-btn') },
        { desc: 'parent.css defines .top-bar-left', passed: css.includes('.top-bar-left') },
        { desc: 'sidebar-toggle.js supports toggleSidebar', passed: js.includes('toggleSidebar') },
        { desc: 'sidebar-toggle.js supports closeSidebar', passed: js.includes('closeSidebar') },
        { desc: 'sidebar-toggle.js supports localStorage persistence', passed: js.includes('localStorage.setItem') },
        { desc: 'sidebar-toggle.js supports keyboard shortcut (Ctrl+B)', passed: js.includes("toLowerCase() === 'b'") },
        { desc: 'sidebar-toggle.js dispatches window resize event for charts', passed: js.includes("new Event('resize')") }
    ];

    let allPassed = true;
    checks.forEach(c => {
        if (c.passed) {
            console.log(`✅ PASS: ${c.desc}`);
        } else {
            console.error(`❌ FAIL: ${c.desc}`);
            allPassed = false;
        }
    });

    if (!allPassed) {
        console.error('\nSome checks failed!');
        process.exit(1);
    } else {
        console.log('\n🎉 ALL PARENT DASHBOARD SIDEBAR TOGGLE CHECKS PASSED!');
    }
}

testParentSidebarToggle();
