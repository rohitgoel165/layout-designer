import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { 
  ArrowRightLeft, 
  Play, 
  Pause, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Database, 
  FileText, 
  Eye,
  Download,
  Trash2,
  Settings,
  Zap
} from 'lucide-react';
import { LayoutZone } from './LayoutDesigner';

export interface Platform {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'web' | 'social' | 'print';
  icon: string;
  supportedFormats: string[];
  apiEndpoint?: string;
  credentials?: {
    apiKey?: string;
    username?: string;
    token?: string;
  };
}

export interface MigrationTemplate {
  id: string;
  name: string;
  description: string;
  sourcePlatform: string;
  targetPlatform: string;
  zones: LayoutZone[];
  metadata: {
    dimensions: { width: number; height: number };
    dpi: number;
    colorSpace: string;
    fonts: string[];
  };
  variables: Array<{
    name: string;
    type: 'text' | 'image' | 'url' | 'date' | 'number';
    defaultValue: string;
    isRequired: boolean;
  }>;
  createdAt: Date;
  tags: string[];
}

export interface MigrationTransaction {
  id: string;
  name: string;
  sourcePlatform: Platform;
  targetPlatform: Platform;
  templates: MigrationTemplate[];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  settings: {
    preserveFormatting: boolean;
    convertImages: boolean;
    optimizeForTarget: boolean;
    generateVariants: boolean;
  };
  results: {
    successful: Array<{
      sourceId: string;
      targetId: string;
      format: string;
      url?: string;
    }>;
    failed: Array<{
      sourceId: string;
      error: string;
      details?: any;
    }>;
  };
  logs: Array<{
    id: string;
    timestamp: Date;
    level: 'info' | 'warning' | 'error' | 'success';
    message: string;
    details?: any;
  }>;
}

interface MigrationProps {
  onCreateJob: (transaction: Omit<MigrationTransaction, 'id' | 'createdAt' | 'logs'>) => void;
}

export function Migration({ onCreateJob }: MigrationProps) {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [templates, setTemplates] = useState<MigrationTemplate[]>([]);
  const [transactions, setTransactions] = useState<MigrationTransaction[]>([]);
  const [activeTab, setActiveTab] = useState('platforms');
  const [selectedSourcePlatform, setSelectedSourcePlatform] = useState<string>('');
  const [selectedTargetPlatform, setSelectedTargetPlatform] = useState<string>('');
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [migrationSettings, setMigrationSettings] = useState({
    preserveFormatting: true,
    convertImages: true,
    optimizeForTarget: true,
    generateVariants: false
  });
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);

  // Initialize with sample data
  useEffect(() => {
    const samplePlatforms: Platform[] = [
      {
        id: 'mailchimp',
        name: 'Mailchimp',
        type: 'email',
        icon: '📧',
        supportedFormats: ['html', 'json', 'pdf'],
        apiEndpoint: 'https://us1.api.mailchimp.com/3.0'
      },
      {
        id: 'hubspot',
        name: 'HubSpot',
        type: 'email',
        icon: '🔶',
        supportedFormats: ['html', 'json', 'pdf'],
        apiEndpoint: 'https://api.hubapi.com'
      },
      {
        id: 'salesforce',
        name: 'Salesforce Marketing Cloud',
        type: 'email',
        icon: '☁️',
        supportedFormats: ['html', 'json', 'xml'],
        apiEndpoint: 'https://mc.exacttarget.com/rest'
      },
      {
        id: 'twilio',
        name: 'Twilio SendGrid',
        type: 'email',
        icon: '📨',
        supportedFormats: ['html', 'json'],
        apiEndpoint: 'https://api.sendgrid.com/v3'
      },
      {
        id: 'wordpress',
        name: 'WordPress',
        type: 'web',
        icon: '🌐',
        supportedFormats: ['html', 'css', 'json'],
        apiEndpoint: 'https://wordpress.com/wp-json/wp/v2'
      },
      {
        id: 'shopify',
        name: 'Shopify',
        type: 'web',
        icon: '🛒',
        supportedFormats: ['liquid', 'html', 'json'],
        apiEndpoint: 'https://shopify.dev/api'
      }
    ];

    const sampleTemplates: MigrationTemplate[] = [
      {
        id: 'template-001',
        name: 'Newsletter Template',
        description: 'Weekly newsletter with header, content sections, and footer',
        sourcePlatform: 'mailchimp',
        targetPlatform: 'hubspot',
        zones: [],
        metadata: {
          dimensions: { width: 600, height: 800 },
          dpi: 72,
          colorSpace: 'sRGB',
          fonts: ['Arial', 'Helvetica']
        },
        variables: [
          { name: 'company_name', type: 'text', defaultValue: 'Your Company', isRequired: true },
          { name: 'header_image', type: 'image', defaultValue: '', isRequired: false },
          { name: 'newsletter_date', type: 'date', defaultValue: new Date().toISOString(), isRequired: true }
        ],
        createdAt: new Date(Date.now() - 86400000),
        tags: ['newsletter', 'marketing']
      },
      {
        id: 'template-002',
        name: 'Product Launch Email',
        description: 'Product announcement template with hero image and CTA',
        sourcePlatform: 'hubspot',
        targetPlatform: 'salesforce',
        zones: [],
        metadata: {
          dimensions: { width: 640, height: 900 },
          dpi: 72,
          colorSpace: 'sRGB',
          fonts: ['Georgia', 'Times New Roman']
        },
        variables: [
          { name: 'product_name', type: 'text', defaultValue: 'New Product', isRequired: true },
          { name: 'product_image', type: 'image', defaultValue: '', isRequired: true },
          { name: 'launch_date', type: 'date', defaultValue: new Date().toISOString(), isRequired: true },
          { name: 'cta_url', type: 'url', defaultValue: 'https://example.com', isRequired: true }
        ],
        createdAt: new Date(Date.now() - 43200000),
        tags: ['product', 'launch', 'announcement']
      }
    ];

    const sampleTransactions: MigrationTransaction[] = [
      {
        id: 'migration-001',
        name: 'Q4 Email Campaign Migration',
        sourcePlatform: samplePlatforms[0],
        targetPlatform: samplePlatforms[1],
        templates: [sampleTemplates[0]],
        status: 'completed',
        progress: 100,
        createdAt: new Date(Date.now() - 7200000),
        completedAt: new Date(Date.now() - 6000000),
        totalItems: 25,
        processedItems: 23,
        failedItems: 2,
        settings: {
          preserveFormatting: true,
          convertImages: true,
          optimizeForTarget: true,
          generateVariants: false
        },
        results: {
          successful: [
            { sourceId: 'src-001', targetId: 'tgt-001', format: 'html', url: 'https://example.com/migrated-001' },
            { sourceId: 'src-002', targetId: 'tgt-002', format: 'html', url: 'https://example.com/migrated-002' }
          ],
          failed: [
            { sourceId: 'src-025', error: 'Invalid image format', details: { format: 'webp' } }
          ]
        },
        logs: [
          {
            id: 'log-001',
            timestamp: new Date(Date.now() - 7200000),
            level: 'info',
            message: 'Migration started'
          },
          {
            id: 'log-002',
            timestamp: new Date(Date.now() - 6000000),
            level: 'success',
            message: 'Migration completed successfully'
          }
        ]
      }
    ];

    setPlatforms(samplePlatforms);
    setTemplates(sampleTemplates);
    setTransactions(sampleTransactions);
  }, []);

  const handleStartMigration = () => {
    const sourcePlatform = platforms.find(p => p.id === selectedSourcePlatform);
    const targetPlatform = platforms.find(p => p.id === selectedTargetPlatform);
    const selectedTemplateData = templates.filter(t => selectedTemplates.includes(t.id));

    if (!sourcePlatform || !targetPlatform || selectedTemplateData.length === 0) {
      return;
    }

    const transaction: Omit<MigrationTransaction, 'id' | 'createdAt' | 'logs'> = {
      name: `Migration from ${sourcePlatform.name} to ${targetPlatform.name}`,
      sourcePlatform,
      targetPlatform,
      templates: selectedTemplateData,
      status: 'pending',
      progress: 0,
      totalItems: selectedTemplateData.length * 10, // Simulated
      processedItems: 0,
      failedItems: 0,
      settings: migrationSettings,
      results: {
        successful: [],
        failed: []
      }
    };

    onCreateJob(transaction);
    setSelectedTemplates([]);
  };

  const availableTemplates = templates.filter(t => 
    (!selectedSourcePlatform || t.sourcePlatform === selectedSourcePlatform) &&
    (!selectedTargetPlatform || t.targetPlatform === selectedTargetPlatform)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2>Platform Migration</h2>
          <p className="text-muted-foreground">
            Migrate customer communication assets between platforms
          </p>
        </div>
        
        <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Start Migration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Configure Migration</DialogTitle>
              <DialogDescription>
                Set up migration from source platform to target platform with your selected templates.
              </DialogDescription>
            </DialogHeader>
            <MigrationConfigDialog 
              platforms={platforms}
              templates={availableTemplates}
              selectedSourcePlatform={selectedSourcePlatform}
              selectedTargetPlatform={selectedTargetPlatform}
              selectedTemplates={selectedTemplates}
              settings={migrationSettings}
              onSourcePlatformChange={setSelectedSourcePlatform}
              onTargetPlatformChange={setSelectedTargetPlatform}
              onTemplatesChange={setSelectedTemplates}
              onSettingsChange={setMigrationSettings}
              onStart={handleStartMigration}
              onCancel={() => setIsConfigDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="platforms">
          <PlatformsView platforms={platforms} />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesView templates={templates} platforms={platforms} />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionsView transactions={transactions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MigrationConfigDialog({
  platforms,
  templates,
  selectedSourcePlatform,
  selectedTargetPlatform,
  selectedTemplates,
  settings,
  onSourcePlatformChange,
  onTargetPlatformChange,
  onTemplatesChange,
  onSettingsChange,
  onStart,
  onCancel
}: {
  platforms: Platform[];
  templates: MigrationTemplate[];
  selectedSourcePlatform: string;
  selectedTargetPlatform: string;
  selectedTemplates: string[];
  settings: any;
  onSourcePlatformChange: (platform: string) => void;
  onTargetPlatformChange: (platform: string) => void;
  onTemplatesChange: (templates: string[]) => void;
  onSettingsChange: (settings: any) => void;
  onStart: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Source Platform</Label>
          <Select value={selectedSourcePlatform} onValueChange={onSourcePlatformChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select source platform" />
            </SelectTrigger>
            <SelectContent>
              {platforms.map(platform => (
                <SelectItem key={platform.id} value={platform.id}>
                  {platform.icon} {platform.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label>Target Platform</Label>
          <Select value={selectedTargetPlatform} onValueChange={onTargetPlatformChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select target platform" />
            </SelectTrigger>
            <SelectContent>
              {platforms.map(platform => (
                <SelectItem key={platform.id} value={platform.id}>
                  {platform.icon} {platform.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Templates to Migrate</Label>
        <div className="mt-2 space-y-2 max-h-48 overflow-auto border rounded p-2">
          {templates.map(template => (
            <div key={template.id} className="flex items-center space-x-2">
              <Checkbox
                checked={selectedTemplates.includes(template.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onTemplatesChange([...selectedTemplates, template.id]);
                  } else {
                    onTemplatesChange(selectedTemplates.filter(id => id !== template.id));
                  }
                }}
              />
              <div className="flex-1">
                <p className="font-medium">{template.name}</p>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Migration Settings</Label>
        <div className="mt-2 space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={settings.preserveFormatting}
              onCheckedChange={(checked) => onSettingsChange({ ...settings, preserveFormatting: checked })}
            />
            <Label>Preserve original formatting</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={settings.convertImages}
              onCheckedChange={(checked) => onSettingsChange({ ...settings, convertImages: checked })}
            />
            <Label>Convert images to target format</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={settings.optimizeForTarget}
              onCheckedChange={(checked) => onSettingsChange({ ...settings, optimizeForTarget: checked })}
            />
            <Label>Optimize for target platform</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={settings.generateVariants}
              onCheckedChange={(checked) => onSettingsChange({ ...settings, generateVariants: checked })}
            />
            <Label>Generate platform variants</Label>
          </div>
        </div>
      </div>

      <div className="flex space-x-2">
        <Button onClick={onStart} className="flex-1" disabled={!selectedSourcePlatform || !selectedTargetPlatform || selectedTemplates.length === 0}>
          <Play className="w-4 h-4 mr-2" />
          Start Migration
        </Button>
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  );
}

function PlatformsView({ platforms }: { platforms: Platform[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {platforms.map(platform => (
        <Card key={platform.id}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="text-2xl mr-2">{platform.icon}</span>
              {platform.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <Label>Type</Label>
                <Badge variant="secondary">{platform.type}</Badge>
              </div>
              <div>
                <Label>Supported Formats</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {platform.supportedFormats.map(format => (
                    <Badge key={format} variant="outline" className="text-xs">
                      {format}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="pt-2">
                <Button variant="outline" size="sm" className="w-full">
                  <Settings className="w-3 h-3 mr-2" />
                  Configure
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TemplatesView({ templates, platforms }: { templates: MigrationTemplate[]; platforms: Platform[] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => {
          const sourcePlatform = platforms.find(p => p.id === template.sourcePlatform);
          const targetPlatform = platforms.find(p => p.id === template.targetPlatform);
          
          return (
            <Card key={template.id}>
              <CardHeader>
                <CardTitle>{template.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{sourcePlatform?.icon} {sourcePlatform?.name}</span>
                    <ArrowRightLeft className="w-4 h-4" />
                    <span className="text-sm">{targetPlatform?.icon} {targetPlatform?.name}</span>
                  </div>
                  
                  <div>
                    <Label>Variables ({template.variables.length})</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {template.variables.slice(0, 3).map(variable => (
                        <Badge key={variable.name} variant="outline" className="text-xs">
                          {variable.name}
                        </Badge>
                      ))}
                      {template.variables.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.variables.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="w-3 h-3 mr-2" />
                      Preview
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Zap className="w-3 h-3 mr-2" />
                      Convert
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function TransactionsView({ transactions }: { transactions: MigrationTransaction[] }) {
  const getStatusIcon = (status: MigrationTransaction['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'cancelled':
        return <Pause className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: MigrationTransaction['status']) => {
    const variants: Record<MigrationTransaction['status'], 'default' | 'secondary' | 'destructive'> = {
      pending: 'secondary',
      processing: 'default',
      completed: 'default',
      failed: 'destructive',
      cancelled: 'secondary'
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Migration</TableHead>
              <TableHead>Source → Target</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map(transaction => (
              <TableRow key={transaction.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{transaction.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.templates.length} templates
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">
                      {transaction.sourcePlatform.icon} {transaction.sourcePlatform.name}
                    </span>
                    <ArrowRightLeft className="w-3 h-3" />
                    <span className="text-sm">
                      {transaction.targetPlatform.icon} {transaction.targetPlatform.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Progress value={transaction.progress} className="w-20" />
                    <span className="text-xs text-muted-foreground">{transaction.progress}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="text-green-600">{transaction.processedItems} processed</div>
                    <div className="text-red-600">{transaction.failedItems} failed</div>
                    <div className="text-muted-foreground">{transaction.totalItems} total</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(transaction.status)}
                    {getStatusBadge(transaction.status)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {transaction.createdAt.toLocaleDateString()}
                    <br />
                    <span className="text-muted-foreground">
                      {transaction.createdAt.toLocaleTimeString()}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-1">
                    <Button size="sm" variant="ghost">
                      <Eye className="w-3 h-3" />
                    </Button>
                    {transaction.status === 'completed' && (
                      <Button size="sm" variant="ghost">
                        <Download className="w-3 h-3" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}