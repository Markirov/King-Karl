import { useState } from 'react';
import { Menu, Settings } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { SecretMenu } from './SecretMenu';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'] as const;

export function Header() {
  const { campaign, toggleSidebar } = useAppStore();
  const [secretOpen, setSecretOpen] = useState(false);

  return (
    <>
      <header
        className="
          fixed top-0 left-0 lg:left-[220px] right-0 h-12
          bg-surface-dim border-b border-surface-container-highest
          flex items-center justify-between px-4 lg:px-6 z-[99]
          backdrop-blur-xl
        "
      >
        {/* Mobile hamburger */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden w-9 h-9 flex items-center justify-center bg-surface-container border border-outline-variant text-primary-container"
        >
          <Menu size={18} />
        </button>

        <span className="font-headline text-[11px] font-semibold text-on-surface-variant tracking-[2px] uppercase">
          Comisión de Revisión y Fianza de{' '}
          <span onClick={() => setSecretOpen(true)} className="cursor-default select-none">M</span>
          ercenarios
        </span>

        <div className="flex items-center gap-5">
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="font-mono text-[9px] text-outline tracking-wider">CAMPAÑA</span>
            <span className="font-headline text-[13px] font-bold text-primary-container">
              {MESES[(campaign.campaignMonth || 1) - 1]} de {campaign.campaignYear}
            </span>
          </div>
          <button className="w-8 h-8 flex items-center justify-center text-outline hover:text-primary-container transition-colors">
            <Settings size={16} />
          </button>
        </div>
      </header>

      <SecretMenu open={secretOpen} onClose={() => setSecretOpen(false)} />
    </>
  );
}
