import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { GitBranch, Eye, Download, Trash2, Plus, Archive } from 'lucide-react';
import { LayoutZone } from './LayoutDesigner';

export interface LayoutVersion {
  id: string;
  layoutId: string;
  version: string;
  name: string;
  description: string;
  zones: LayoutZone[];
  createdAt: Date;
  createdBy: string;
  isActive: boolean;
  tags: string[];
  changeLog: string[];
}

interface VersionControlProps {
  versions: LayoutVersion[];
  currentVersion: LayoutVersion | null;
  onCreateVersion: (version: Omit<LayoutVersion, 'id' | 'createdAt'>) => void;
  onRestoreVersion: (versionId: string) => void;
  onDeleteVersion: (versionId: string) => void;
  onPreviewVersion: (versionId: string) => void;
  onExportVersion: (versionId: string) => void;
}

export function VersionControl({
  versions,
  currentVersion,
  onCreateVersion,
  onRestoreVersion,
  onDeleteVersion,
  onPreviewVersion,
  onExportVersion
}: VersionControlProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newVersionData, setNewVersionData] = useState({
    name: '',
    description: '',
    tags: ''
  });

  const handleCreateVersion = () => {
    if (!currentVersion) return;
    
    const version: Omit<LayoutVersion, 'id' | 'createdAt'> = {
      layoutId: currentVersion.layoutId,
      version: `v${versions.length + 1}.0`,
      name: newVersionData.name,
      description: newVersionData.description,
      zones: currentVersion.zones,
      createdBy: 'Current User', // In real app, get from auth
      isActive: false,
      tags: newVersionData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      changeLog: [`Version ${versions.length + 1}.0 created`]
    };
    
    onCreateVersion(version);
    setNewVersionData({ name: '', description: '', tags: '' });
    setIsCreateDialogOpen(false);
  };

  const sortedVersions = [...versions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2>Version Control</h2>
          <p className="text-muted-foreground">
            Manage layout versions and track changes
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Version
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Version</DialogTitle>
              <DialogDescription>
                Create a new version of your layout with custom name and description.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Version Name</Label>
                <Input
                  value={newVersionData.name}
                  onChange={(e) => setNewVersionData({ ...newVersionData, name: e.target.value })}
                  placeholder="e.g., Major layout update"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newVersionData.description}
                  onChange={(e) => setNewVersionData({ ...newVersionData, description: e.target.value })}
                  placeholder="Describe the changes made in this version..."
                />
              </div>
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={newVersionData.tags}
                  onChange={(e) => setNewVersionData({ ...newVersionData, tags: e.target.value })}
                  placeholder="feature, bugfix, layout-update"
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleCreateVersion} className="flex-1">
                  Create Version
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {currentVersion && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <GitBranch className="w-5 h-5 mr-2" />
              Current Version: {currentVersion.version}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <p>{currentVersion.name}</p>
              </div>
              <div>
                <Label>Created</Label>
                <p>{currentVersion.createdAt.toLocaleString()}</p>
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <p>{currentVersion.description}</p>
              </div>
              <div className="col-span-2">
                <Label>Tags</Label>
                <div className="flex space-x-1 mt-1">
                  {currentVersion.tags.map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedVersions.map(version => (
                <TableRow key={version.id}>
                  <TableCell className="font-mono">
                    {version.version}
                  </TableCell>
                  <TableCell>
                    {version.name}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {version.description}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      {version.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {version.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{version.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {version.createdAt.toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {version.createdBy}
                  </TableCell>
                  <TableCell>
                    {version.isActive ? (
                      <Badge>Active</Badge>
                    ) : (
                      <Badge variant="secondary">Archived</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => onPreviewVersion(version.id)}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => onExportVersion(version.id)}
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                      {!version.isActive && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => onRestoreVersion(version.id)}
                        >
                          <Archive className="w-3 h-3" />
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => onDeleteVersion(version.id)}
                      >
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

      {sortedVersions.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <GitBranch className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3>No versions yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first version to start tracking changes
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              Create First Version
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}