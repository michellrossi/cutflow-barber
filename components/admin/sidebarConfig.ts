// Configuração central da sidebar do admin.
// Separado do AdminDashboard.tsx para facilitar manutenção: adicionar,
// remover ou reordenar itens não exige tocar na lógica do componente.

export type AdminTab =
    | 'dashboard' | 'team' | 'services' | 'coupons' | 'appointments' | 'clients'
    | 'settings' | 'loyalty' | 'insight' | 'reminders' | 'subscriptions' | 'plan'
    | 'reports' | 'profile' | 'inventory' | 'goals' | 'financial';

export interface SidebarItemConfig {
    tab: AdminTab;
    label: string;
    iconName:
    | 'LayoutGrid' | 'CalendarCheck' | 'Users' | 'Scissors' | 'UserCircle'
    | 'CreditCard' | 'Tag' | 'Award' | 'BarChart3' | 'Package' | 'TrendingUp'
    | 'Target' | 'MessageSquare' | 'Sparkles' | 'ShieldCheck' | 'User' | 'Settings';
}

export interface SidebarGroupConfig {
    id: string;
    // Grupos sem título (ex: itens fixos do topo) não renderizam cabeçalho
    // nem podem ser colapsados.
    title: string | null;
    collapsible: boolean;
    // Aberto por padrão na primeira visita (antes de qualquer preferência salva)
    defaultOpen: boolean;
    items: SidebarItemConfig[];
}

// Itens de uso diário ficam sempre visíveis, sem agrupamento, no topo.
// O restante é organizado por contexto de uso e pode ser recolhido.
export const SIDEBAR_GROUPS: SidebarGroupConfig[] = [
    {
        id: 'pinned',
        title: null,
        collapsible: false,
        defaultOpen: true,
        items: [
            { tab: 'dashboard', label: 'Dashboard', iconName: 'LayoutGrid' },
            { tab: 'appointments', label: 'Agenda', iconName: 'CalendarCheck' },
            { tab: 'clients', label: 'Clientes', iconName: 'UserCircle' },
            { tab: 'financial', label: 'Financeiro', iconName: 'TrendingUp' },
        ],
    },
    {
        id: 'operacao',
        title: 'Operação',
        collapsible: true,
        defaultOpen: true,
        items: [
            { tab: 'team', label: 'Equipe', iconName: 'Users' },
            { tab: 'services', label: 'Serviços', iconName: 'Scissors' },
            { tab: 'inventory', label: 'Produtos', iconName: 'Package' },
        ],
    },
    {
        id: 'vendas',
        title: 'Clientes e vendas',
        collapsible: true,
        defaultOpen: false,
        items: [
            { tab: 'coupons', label: 'Cupons', iconName: 'Tag' },
            { tab: 'loyalty', label: 'Fidelidade', iconName: 'Award' },
            { tab: 'subscriptions', label: 'Assinaturas', iconName: 'CreditCard' },
        ],
    },
    {
        id: 'analise',
        title: 'Análise',
        collapsible: true,
        defaultOpen: false,
        items: [
            { tab: 'reports', label: 'Relatórios', iconName: 'BarChart3' },
            { tab: 'goals', label: 'Metas', iconName: 'Target' },
        ],
    },
    {
        id: 'crescimento',
        title: 'Crescimento',
        collapsible: true,
        defaultOpen: false,
        items: [
            { tab: 'reminders', label: 'Automação', iconName: 'MessageSquare' },
            { tab: 'insight', label: 'Insights (IA)', iconName: 'Sparkles' },
        ],
    },
    {
        id: 'conta',
        title: 'Conta',
        collapsible: true,
        defaultOpen: false,
        items: [
            { tab: 'plan', label: 'Meu Plano', iconName: 'ShieldCheck' },
            { tab: 'profile', label: 'Perfil', iconName: 'User' },
            { tab: 'settings', label: 'Configurações', iconName: 'Settings' },
        ],
    },
];

// Dado uma tab, retorna o id do grupo ao qual ela pertence.
// Usado para auto-expandir a seção certa quando a tab ativa está
// dentro de um grupo colapsado (ex: veio de um link direto ou do
// localStorage com a seção fechada).
export function findGroupForTab(tab: AdminTab): string | undefined {
    return SIDEBAR_GROUPS.find(group => group.items.some(item => item.tab === tab))?.id;
}