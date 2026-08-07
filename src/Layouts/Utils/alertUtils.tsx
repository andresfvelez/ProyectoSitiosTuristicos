import Swal, { SweetAlertIcon } from 'sweetalert2';

export const mostrarAlerta = ({
                                  title,
                                  text,
                                  html,
                                  icon = 'info',
                                  confirmButtonText = 'Entendido'
                              }: {
    title: string;
    text?: string;
    html?: string;
    icon?: SweetAlertIcon;
    confirmButtonText?: string;
}) => {
    return Swal.fire({
        title,
        text,
        html,
        icon,
        confirmButtonText,
        confirmButtonColor: '#1976d2',
        background: '#ffffff',
        width: '520px', // Formato horizontal alargado
        padding: '1.25rem 1.75rem',
        buttonsStyling: true,
        showCloseButton: true,
        didOpen: (popup) => {
            // Bordes y sombra modernos
            popup.style.borderRadius = '12px';
            popup.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)';

            // Reducción del ícono gigante
            const iconEl = popup.querySelector('.swal2-icon') as HTMLElement;
            if (iconEl) {
                iconEl.style.transform = 'scale(0.55)';
                iconEl.style.margin = '-10px auto -10px auto';
            }

            // Tipografía compacta y limpia
            const titleEl = popup.querySelector('.swal2-title') as HTMLElement;
            if (titleEl) {
                titleEl.style.fontSize = '1.1rem';
                titleEl.style.fontWeight = '600';
                titleEl.style.color = '#0f172a';
                titleEl.style.padding = '0';
            }

            const htmlContainer = popup.querySelector('.swal2-html-container') as HTMLElement;
            if (htmlContainer) {
                htmlContainer.style.fontSize = '0.875rem';
                htmlContainer.style.color = '#475569';
                htmlContainer.style.margin = '0.5rem 0 0 0';
            }

            // Botón integrado sin altura excesiva
            const confirmBtn = popup.querySelector('.swal2-confirm') as HTMLElement;
            if (confirmBtn) {
                confirmBtn.style.borderRadius = '6px';
                confirmBtn.style.padding = '6px 20px';
                confirmBtn.style.fontSize = '0.85rem';
                confirmBtn.style.fontWeight = '600';
                confirmBtn.style.boxShadow = 'none';
            }

            const actionsEl = popup.querySelector('.swal2-actions') as HTMLElement;
            if (actionsEl) {
                actionsEl.style.margin = '1rem 0 0 0';
            }
        }
    });
};