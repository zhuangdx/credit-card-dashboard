document.addEventListener('DOMContentLoaded', () => {
    const formTitle = document.getElementById('form-title');
    const submitBtn = document.getElementById('submit-btn');
    const toggleText = document.getElementById('toggle-text');
    const toggleLink = document.getElementById('toggle-link');
    const errorMessage = document.getElementById('error-message');
    
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    let isLoginMode = true;

    const API_BASE_URL = 'http://localhost:3000/api/auth';

    toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        updateFormMode();
    });

    function updateFormMode() {
        errorMessage.textContent = '';
        if (isLoginMode) {
            formTitle.textContent = '登录';
            submitBtn.textContent = '登录';
            toggleText.textContent = '还没有账户？';
            toggleLink.textContent = '立即注册';
        } else {
            formTitle.textContent = '注册';
            submitBtn.textContent = '注册';
            toggleText.textContent = '已有账户？';
            toggleLink.textContent = '立即登录';
        }
    }

    async function handleSubmit() {
        const username = usernameInput.value;
        const password = passwordInput.value;

        if (!username || !password) {
            errorMessage.textContent = '用户名和密码不能为空。';
            return;
        }

        const endpoint = isLoginMode ? '/login' : '/register';
        const url = `${API_BASE_URL}${endpoint}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                errorMessage.textContent = data.message || '操作失败，请重试。';
                return;
            }

            if (isLoginMode) {
                // Login successful
                localStorage.setItem('authToken', data.accessToken);
                localStorage.setItem('username', data.username);
                window.location.href = '/index.html';
            } else {
                // Register successful, switch to login mode
                alert('注册成功！请使用新账户登录。');
                isLoginMode = true;
                updateFormMode();
            }

        } catch (error) {
            errorMessage.textContent = '网络错误，请检查后端服务是否开启。';
            console.error('Auth error:', error);
        }
    }

    submitBtn.addEventListener('click', handleSubmit);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    });

    updateFormMode();
});