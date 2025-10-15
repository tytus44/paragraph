// Paragraph v5.8 - JavaScript (Info & Tema)

let currentZoom = 100;
let undoStack = [];
let redoStack = [];
let isLandscape = false;
let confirmCallback = null;

// ============ EVENT HANDLERS & INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    document.execCommand('defaultParagraphSeparator', false, 'p');
    // Applica il tema salvato, se esiste
    const savedTheme = localStorage.getItem('paragraphTheme');
    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
    }
    
    document.getElementById('editor').innerHTML = '<p>Inizia a scrivere il tuo documento qui...</p>';
    
    updateStatus();
    saveState();
});

function handleInput() {
    clearTimeout(window.inputTimeout);
    window.inputTimeout = setTimeout(() => {
        updateStatus();
        saveState();
    }, 300);
}

function handleKeydown(e) {
    if (e.ctrlKey) {
        switch(e.key.toLowerCase()) {
            case 'z': e.preventDefault(); undo(); break;
            case 'y': e.preventDefault(); redo(); break;
            case 'b': e.preventDefault(); formatText('bold'); break;
            case 'i': e.preventDefault(); formatText('italic'); break;
            case 'u': e.preventDefault(); formatText('underline'); break;
        }
    }
}

// ============ CORE FUNCTIONS ============
function formatText(command, value = null) {
    document.execCommand(command, false, value);
    document.getElementById('editor').focus();
    updateToolbar();
}

// ============ UI & STATUS ============
function updateToolbar() {
    ['bold', 'italic', 'underline', 'strikeThrough'].forEach(cmd => {
        try {
            const btnId = cmd.toLowerCase().replace('strikethrough', 'strike') + 'Btn';
            const btn = document.getElementById(btnId);
            if(btn) {
                const isActive = document.queryCommandState(cmd);
                btn.classList.toggle('active', isActive);
            }
        } catch (e) { /* ignorato */ }
    });
}

function updateStatus() {
    const text = document.getElementById('editor').innerText || '';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    document.getElementById('wordCount').textContent = `Parole: ${words}`;
    document.getElementById('charCount').textContent = `Caratteri: ${text.length}`;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showConfirm(title, message, callback) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = callback;
    document.getElementById('confirmModal').classList.add('show');
}

function confirmAction() {
    if (confirmCallback) confirmCallback();
    closeModal('confirmModal');
}

// ============ PAGE & VIEW ============
function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.body.removeAttribute('data-theme');
        localStorage.removeItem('paragraphTheme');
    } else {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('paragraphTheme', 'dark');
    }
}

function togglePageOrientation() {
    isLandscape = !isLandscape;
    document.getElementById('mainPage').classList.toggle('landscape', isLandscape);
    document.getElementById('pageFormat').textContent = isLandscape ? 'A4 Orizzontale' : 'A4 Verticale';
}

function toggleFocusMode() {
    const isFocus = document.body.classList.toggle('focus-mode');
    if (isFocus) {
        enterFullscreen();
    } else {
        exitFullscreen();
    }
}

function enterFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { /* Safari */
        elem.webkitRequestFullscreen();
    }
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
    }
}

document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && document.body.classList.contains('focus-mode')) {
        document.body.classList.remove('focus-mode');
    }
});

function updateZoom() {
    const zoomContainer = document.getElementById('zoomContainer');
    zoomContainer.style.transform = `scale(${currentZoom / 100})`;
    document.getElementById('zoomLevel').textContent = `${currentZoom}%`;
}
function zoomIn() { if (currentZoom < 200) { currentZoom += 10; updateZoom(); } }
function zoomOut() { if (currentZoom > 50) { currentZoom -= 10; updateZoom(); } }

// ============ FILE OPERATIONS ============
function newDocument() {
    showConfirm('Nuovo Documento', 'Creare un nuovo documento? Le modifiche non salvate andranno perse.', () => {
        document.getElementById('editor').innerHTML = '<p><br></p>';
        updateStatus();
        saveState();
    });
}

function loadDocument() { document.getElementById('fileInput').click(); }
function handleFileLoad(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById('editor').innerHTML = DOMPurify.sanitize(e.target.result);
            updateStatus();
            saveState();
        };
        reader.readAsText(file);
    }
    event.target.value = '';
}

function htmlToPlainText(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
}

async function saveDocument(format) {
    const content = DOMPurify.sanitize(document.getElementById('editor').innerHTML);
    const filename = `documento.${format}`;

    if (format === 'pdf') {
        const element = document.createElement('div');
        element.style.fontFamily = getComputedStyle(document.getElementById('editor')).fontFamily;
        element.innerHTML = content;
        html2pdf().from(element).save(filename);
    } else if (format === 'docx') {
        const textContent = htmlToPlainText(content);
        const doc = new docx.Document({ sections: [{ children: [new docx.Paragraph(textContent)] }] });
        const blob = await docx.Packer.toBlob(doc);
        downloadBlob(blob, filename);
    } else {
        const mimeType = format === 'html' ? 'text/html' : 'text/plain';
        const data = format === 'txt' ? htmlToPlainText(content) : content;
        const blob = new Blob([data], { type: mimeType });
        downloadBlob(blob, filename);
    }
}

function downloadBlob(blob, name) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

// ============ MODAL OPERATIONS ============
function openInfoModal() { document.getElementById('infoModal').classList.add('show'); }
function openFindReplace() { document.getElementById('findReplaceModal').classList.add('show'); }

// Funzione generica per chiudere i modali con animazione
function closeModal(modalId) {
    const modalOverlay = document.getElementById(modalId);
    if (modalOverlay) {
        modalOverlay.classList.add('is-closing');
        setTimeout(() => {
            modalOverlay.classList.remove('show', 'is-closing');
        }, 500); // Durata deve corrispondere all'animazione CSS
    }
}

function replaceAll() {
    const find = document.getElementById('findText').value;
    const replace = document.getElementById('replaceText').value;
    if (find) {
        const editor = document.getElementById('editor');
        editor.innerHTML = editor.innerHTML.replace(new RegExp(find, 'g'), replace);
        saveState();
    }
}

// ============ UNDO / REDO ============
function saveState() {
    const content = document.getElementById('mainPage').innerHTML;
    if (undoStack[undoStack.length - 1] !== content) {
        undoStack.push(content);
        if (undoStack.length > 50) undoStack.shift();
        redoStack = [];
    }
}

function undo() {
    if (undoStack.length > 1) {
        redoStack.push(undoStack.pop());
        document.getElementById('mainPage').innerHTML = undoStack[undoStack.length - 1];
        updateStatus();
    }
}

function redo() {
    if (redoStack.length > 0) {
        const state = redoStack.pop();
        undoStack.push(state);
        document.getElementById('mainPage').innerHTML = state;
        updateStatus();
    }
}

// ============ PRINT PREVIEW ============
function openPrintPreview() {
    document.getElementById('printPreviewModal').classList.add('show');
    setTimeout(() => {
        try {
            const previewContainer = document.getElementById('printPreviewContainer');
            previewContainer.innerHTML = '';
            
            const contentNodes = Array.from(document.getElementById('editor').cloneNode(true).childNodes);
            
            let currentPage = createNewPreviewPage(previewContainer);
            let currentEditor = currentPage.querySelector('.editor');
            const availableHeight = currentEditor.clientHeight;

            if (availableHeight <= 0) throw new Error("Altezza pagina non calcolabile.");

            contentNodes.forEach(node => {
                currentEditor.appendChild(node);
                if (currentEditor.scrollHeight > availableHeight) {
                    currentEditor.removeChild(node);
                    currentPage = createNewPreviewPage(previewContainer);
                    currentEditor = currentPage.querySelector('.editor');
                    currentEditor.appendChild(node);
                }
            });
        } catch (error) {
            console.error("Errore anteprima di stampa:", error);
            showToast("Errore durante la generazione dell'anteprima.", "error");
            closeModal('printPreviewModal');
        }
    }, 50);
}

function createNewPreviewPage(container) {
    const page = document.createElement('div');
    page.className = 'print-preview-page';
    if (isLandscape) page.classList.add('landscape');
    page.innerHTML = `<div class="editor"></div>`;
    page.querySelector('.editor').style.fontFamily = document.getElementById('fontFamily').value;
    container.appendChild(page);
    return page;
}

function printFromPreview() { window.print(); }

// ============ DROPDOWN & FONT SELECTION ============
function toggleSaveMenu() { document.getElementById('saveMenu').classList.toggle('show'); }
function changeFont() { 
    const font = document.getElementById('fontFamily').value;
    document.getElementById('editor').style.fontFamily = font;
}
function applyStyle() { formatText('formatBlock', document.getElementById('styleSelect').value); }