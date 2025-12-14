
import React from 'react';
import { useOrganization } from '../../context/OrganizationContext';
import { ChevronsUpDown, Check, Building2, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function OrganizationSelector() {
  const { organizations, currentOrg, switchOrganization } = useOrganization();
  const [isOpen, setIsOpen] = React.useState(false);
  const navigate = useNavigate();

  if (!currentOrg) return null;

  return (
    <div className="relative">
        <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted/50 transition-colors"
        >
            <div className="flex items-center gap-2 truncate">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="truncate">{currentOrg.name}</span>
            </div>
            <ChevronsUpDown className="w-4 h-4 text-muted-foreground opacity-50" />
        </button>

        {isOpen && (
            <>
                <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsOpen(false)}
                />
                <div className="absolute top-full left-0 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 py-1">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Select Organization
                    </div>
                    
                    {organizations.map((org) => (
                        <button
                            key={org.id}
                            onClick={() => {
                                switchOrganization(org.id);
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1.5 text-sm hover:bg-muted cursor-pointer ${
                                currentOrg.id === org.id ? 'text-primary' : 'text-foreground'
                            }`}
                        >
                            <span className="truncate">{org.name}</span>
                            {currentOrg.id === org.id && (
                                <Check className="w-4 h-4" />
                            )}
                        </button>
                    ))}
                    
                    <div className="h-px bg-border my-1" />
                    
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            // Navigate to Create Org page (we need to create this page)
                            // For now, let's just use a placeholder or log
                            console.log("Create Org clicked");
                            // navigate('/dashboard/settings'); // Or specific create route
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Create Organization
                    </button>
                </div>
            </>
        )}
    </div>
  );
}
