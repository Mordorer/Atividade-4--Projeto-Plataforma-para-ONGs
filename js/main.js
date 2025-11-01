// =======================================
// 1. UTILIDADES E VARIÁVEIS GLOBAIS
// =======================================

const ROUTES = {
    '/': 'index.html',
    '/index.html': 'index.html',
    '/projetos.html': 'projetos.html',
    '/comunidade.html': 'comunidade.html',
    '/cadastro.html': 'cadastro.html',
    '/gestao.html': 'gestao.html'
};
const appMain = document.querySelector('main');
const notification = document.getElementById('notification');

function showTemporaryMessage(message, success = true) {
    const messageEl = document.getElementById('notification-message');
    
    messageEl.textContent = message;
    
    notification.classList.remove('success', 'error', 'hidden');
    notification.classList.add(success ? 'success' : 'error');
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.classList.add('hidden'), 300);
    }, 3000);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =======================================
// 2. FUNÇÕES DE SPA BÁSICO E ROTAS
// =======================================

// --- NOVO: Lógica do Modo Escuro (WCAG AA) ---
function setupDarkModeToggle() {
    const toggleButton = document.getElementById('dark-mode-toggle');
    
    // Carrega a preferência ao iniciar
    if (localStorage.getItem('dark-mode-preference') === 'dark') {
        document.body.classList.add('dark-mode');
    }
    
    if (!toggleButton) return;

    toggleButton.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        
        // Salva a preferência no localStorage (WCAG persistente)
        localStorage.setItem('dark-mode-preference', isDarkMode ? 'dark' : 'light');
    });
}

async function navigate(url) {
    const path = url.pathname;
    const route = ROUTES[path] || ROUTES['/index.html'];
    
    try {
        const response = await fetch(route);
        const htmlText = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const newContent = doc.querySelector('main').innerHTML;
        
        appMain.innerHTML = newContent;
        history.pushState(null, null, path);
        
        initializePageScripts(path);
    } catch (error) {
        console.error("Erro ao carregar a rota:", error);
    }
}

function setupNavigationInterception() {
    document.body.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.hostname === location.hostname) {
            const url = new URL(link.href);
            if (ROUTES[url.pathname] && url.hash === "") {
                e.preventDefault();
                navigate(url);
            }
        }
    });

    window.addEventListener('popstate', () => {
        navigate(new URL(location.href));
    });
}

// =======================================
// 3. VALIDAÇÃO DE FORMULÁRIO (CONTEÚDO DA ENTREGA III)
// =======================================

function validateField(input) {
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    const telRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;

    let errorMessage = '';
    let isValid = true;

    if (input.required && !input.value) {
        isValid = false;
        errorMessage = 'Campo obrigatório.';
    } else if (input.id === 'email' && input.value && !input.checkValidity()) {
        isValid = false;
        errorMessage = 'E-mail inválido.';
    } else if (input.id === 'cpf' && input.value && !cpfRegex.test(input.value)) {
        if (input.value.length >= 10) { 
             isValid = false;
             errorMessage = 'CPF incompleto ou inválido.';
        }
    } else if (input.id === 'telefone' && input.value && !telRegex.test(input.value)) {
        if (input.value.length >= 10) {
             isValid = false;
             errorMessage = 'Telefone incompleto ou inválido.';
        }
    }

    if (!isValid) {
        input.classList.add('error');
        input.title = errorMessage; 
    } else {
        input.classList.remove('error');
        input.title = '';
    }
    return isValid;
}

function setupCadastroForm() {
    const cadastroForm = document.getElementById('cadastroForm');
    if (!cadastroForm) return;

    const masks = { 
        cpf: (value) => value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .substring(0, 14),

        telefone: (value) => value
            .replace(/\D/g, '')
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{4,5})(\d{4})/, '$1-$2')
            .substring(0, 15),

        cep: (value) => value
            .replace(/\D/g, '')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .substring(0, 9)
    };

    document.querySelectorAll('input').forEach(input => {
        const fieldName = input.id;
        
        if (masks[fieldName]) {
            input.addEventListener('input', (e) => {
                e.target.value = masks[fieldName](e.target.value);
                validateField(e.target); 
            });
        }
        if (!masks[fieldName] && input.type !== 'submit' && input.type !== 'hidden') {
             input.addEventListener('blur', (e) => validateField(e.target));
        }
    });

    cadastroForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        let isFormValid = true;
        
        Array.from(this.elements).forEach(el => {
            if (el.tagName !== 'BUTTON' && el.type !== 'submit' && el.type !== 'hidden') {
                if (!validateField(el)) {
                    isFormValid = false;
                }
            }
        });
        
        if (isFormValid) {
            showTemporaryMessage('Formulário enviado com Sucesso, aguarde nosso contato!');
            this.reset();
        } else {
            showTemporaryMessage('Por favor, verifique os campos destacados e preencha corretamente.', false);
        }
    });
}

// =======================================
// 4. MÓDULO DE GESTÃO (CRUD ORIGINAL)
// =======================================

// --- CRUD Funções de Suporte ---
const categoryMap = {
    'educacao': { text: 'Educação', class: 'badge-educacao' },
    'saude': { text: 'Saúde', class: 'badge-saude' },
    'meio-ambiente': { text: 'Meio Ambiente', class: 'badge-meio-ambiente' },
    'cultura': { text: 'Cultura', class: 'badge-cultura' }
};

function resetProjectForm() {
    const projectForm = document.getElementById('projectForm');
    const formTitle = document.getElementById('form-title');
    const saveProjectButton = document.getElementById('saveProjectButton');
    const cancelEditButton = document.getElementById('cancelEditButton');
    
    projectForm.reset();
    projectForm.dataset.editingProjectId = null;
    formTitle.textContent = 'Cadastrar Novo Projeto';
    saveProjectButton.textContent = 'Salvar Projeto';
    cancelEditButton.classList.add('hidden');
    document.getElementById('projectImageUrl').value = ''; 
}

function getCategoryHtml(categoryValue) {
    const categoryInfo = categoryMap[categoryValue] || { text: 'Outro', class: 'badge' };
    return `<span class="badge ${categoryInfo.class}">${categoryInfo.text}</span>`;
}

function getImageUrl(file) {
    return new Promise((resolve) => {
        if (!file) {
            resolve('https://placehold.co/600x400/cccccc/ffffff?text=Sem+Foto');
            return;
        }
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

// --- CRUD Funções de Ação ---
async function addNewProject(data) {
    const projectList = document.getElementById('project-list');
    const newId = Date.now().toString();
    const imageUrl = await getImageUrl(data.media);
    
    const newRow = document.createElement('tr');
    newRow.dataset.id = newId;
    newRow.dataset.image = imageUrl;

    newRow.innerHTML = `
        <td class="p-4"><img src="${imageUrl}" alt="${data.name}" class="h-10 w-16 object-cover rounded"></td>
        <td class="p-4" data-field="name">${data.name}</td>
        <td class="p-4" data-field="category" data-category-value="${data.category}">${getCategoryHtml(data.category)}</td>
        <td class="p-4 space-x-2" style="display: flex; gap: var(--space-xs);">
            <button class="edit-btn btn btn-neutral">Editar</button>
            <button class="gallery-btn btn btn-neutral">Galeria</button>
        </td>
        <td class="hidden" data-field="description">${data.description}</td>
        <td class="hidden" data-field="impact">${data.impact}</td>
    `;
    
    projectList.appendChild(newRow);
    resetProjectForm();
}

async function updateProject(id, data) {
    const projectList = document.getElementById('project-list');
    const row = projectList.querySelector(`tr[data-id="${id}"]`);
    if (!row) return;

    let imageUrl = data.imageUrl;
    if (data.media) {
        imageUrl = await getImageUrl(data.media);
    }
    
    row.dataset.image = imageUrl;

    row.querySelector('img').src = imageUrl;
    row.querySelector('img').alt = data.name;
    row.querySelector('[data-field="name"]').textContent = data.name;
    row.querySelector('[data-field="category"]').innerHTML = getCategoryHtml(data.category);
    row.querySelector('[data-field="category"]').dataset.categoryValue = data.category;
    row.querySelector('[data-field="description"]').textContent = data.description;
    row.querySelector('[data-field="impact"]').textContent = data.impact;

    resetProjectForm();
}

function startEditProject(id, row) {
    const projectForm = document.getElementById('projectForm');
    const formTitle = document.getElementById('form-title');
    const saveProjectButton = document.getElementById('saveProjectButton');
    const cancelEditButton = document.getElementById('cancelEditButton');
    
    projectForm.dataset.editingProjectId = id;

    const name = row.querySelector('[data-field="name"]').textContent;
    const category = row.querySelector('[data-field="category"]').dataset.categoryValue;
    const description = row.querySelector('[data-field="description"]').textContent;
    const impact = row.querySelector('[data-field="impact"]').textContent;
    const imageUrl = row.dataset.image;

    document.getElementById('projectName').value = name;
    document.getElementById('projectCategory').value = category;
    document.getElementById('projectDescription').value = description;
    document.getElementById('projectImpact').value = impact;
    document.getElementById('projectImageUrl').value = imageUrl;

    formTitle.textContent = 'Editar Projeto';
    saveProjectButton.textContent = 'Atualizar Projeto';
    cancelEditButton.classList.remove('hidden');

    formTitle.scrollIntoView({ behavior: 'smooth', block: 'center' });
}


// =======================================
// 5. SCRIPTS AUXILIARES (PÁGINAS)
// =======================================

function setupComunidadePage() {
    // Lógica da Newsletter 
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const emailInput = document.getElementById('newsletterEmail');
            if (emailInput.checkValidity()) {
                showTemporaryMessage('Inscrição realizada com Sucesso!');
                emailInput.value = '';
            } else {
                showTemporaryMessage('Por favor, insira um e-mail válido.', false);
            }
        });
    }

    // Lógica dos Documentos Públicos 
    const downloadLinks = document.querySelectorAll('.document-link');
    downloadLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            showTemporaryMessage('Preparando arquivo para download');
            setTimeout(() => { console.log('Download iniciado:', this.getAttribute('href')); }, 1500);
        });
    });
}

function setupGestaoDashboard() {
    // Lógica de Login 
    document.getElementById('loginForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('dashboard-content').classList.remove('hidden');
    });

    // Lógica do Toggle de Senha 
    const togglePassword = document.getElementById('togglePassword');
    const password = document.getElementById('password');
    const eyeOpen = document.getElementById('eye-open');
    const eyeClosed = document.getElementById('eye-closed');
    if (togglePassword) {
        togglePassword.addEventListener('click', function () {
            const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
            password.setAttribute('type', type);
            if (type === 'text') {
                eyeOpen.classList.add('hidden');
                eyeClosed.classList.remove('hidden');
            } else {
                eyeOpen.classList.remove('hidden');
                eyeClosed.classList.add('hidden');
            }
        });
    }
    
    // --- LÓGICA CRUD DE PROJETOS (UNIFICADA) ---
    const projectForm = document.getElementById('projectForm');
    const projectList = document.getElementById('project-list');
    
    if (projectForm) {
        projectForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('projectName').value,
                category: document.getElementById('projectCategory').value,
                description: document.getElementById('projectDescription').value,
                impact: document.getElementById('projectImpact').value,
                media: document.getElementById('projectMedia').files[0],
                imageUrl: document.getElementById('projectImageUrl').value
            };
            
            const editingId = projectForm.dataset.editingProjectId;
            
            if (editingId) {
                updateProject(editingId, formData);
            } else {
                if (!formData.media) {
                    alert('Por favor, adicione uma foto principal para o novo projeto.');
                    return;
                }
                addNewProject(formData);
            }
        });

        document.getElementById('cancelEditButton').addEventListener('click', resetProjectForm);
    }

    if (projectList) {
        projectList.addEventListener('click', function(e) {
            const editButton = e.target.closest('.edit-btn');
            if (editButton) {
                const row = editButton.closest('tr');
                const id = row.dataset.id;
                startEditProject(id, row);
            }
            
            const galleryButton = e.target.closest('.gallery-btn');
            if (galleryButton) {
                alert('Funcionalidade "Galeria" ainda não implementada.');
            }
        });
    }
}


// =======================================
// 6. INICIALIZAÇÃO GERAL
// =======================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Configura a interceptação de cliques e roteamento (SPA)
    setupNavigationInterception();
    
    // 2. Inicializa os scripts da página atual (necessário para a primeira carga)
    initializePageScripts(location.pathname); 
});

function initializePageScripts(path) {
    // Implementação do Modo Escuro (necessário para todas as páginas)
    setupDarkModeToggle(); 
    
    // Menu mobile
    document.getElementById('mobile-menu-button')?.addEventListener('click', () => {
        document.getElementById('mobile-menu')?.classList.toggle('hidden');
    });

    const currentPath = path || location.pathname;

    if (currentPath.includes('/cadastro.html')) {
        setupCadastroForm();
    } else if (currentPath.includes('/comunidade.html')) {
        setupComunidadePage();
    } else if (currentPath.includes('/gestao.html')) {
        setupGestaoDashboard();
    }
}