import { useState, useEffect, useRef, useCallback } from 'react';
import { UserPlus, X, Shield, User, Crown, Eye, MoreHorizontal, Mail, Search, Loader2 } from 'lucide-react';
import type { ProjectMemberWithUser, ProjectRole, User as UserType } from '../../types/database';
import * as projectService from '../../services/projectService';
import { useAuth } from '../../contexts/AuthContext';

interface TeamManagementProps {
  projectId: string;
  members: ProjectMemberWithUser[];
  ownerId: string;
  onUpdate: () => void;
}

const ROLE_CONFIG: Record<ProjectRole, { label: string; icon: typeof User; color: string }> = {
  owner: { label: 'Owner', icon: Crown, color: 'text-amber-600' },
  admin: { label: 'Admin', icon: Shield, color: 'text-blue-600' },
  member: { label: 'Member', icon: User, color: 'text-gray-600' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-gray-400' },
};

const ROLE_OPTIONS: ProjectRole[] = ['admin', 'member', 'viewer'];

type SearchUser = { id: string; full_name: string; email: string; avatar_url: string | null };

export function TeamManagement({ projectId, members, ownerId, onUpdate }: TeamManagementProps) {
  const { user: currentUser } = useAuth();
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('member');
  const [emailQuery, setEmailQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isOwner = currentUser?.id === ownerId;
  const currentMember = members.find(m => m.user_id === currentUser?.id);
  const canManageMembers = isOwner || currentMember?.role === 'admin';

  const memberUserIds = new Set(members.map(m => m.user_id));

  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setSearching(true);
    const { data } = await projectService.searchUsersByEmail(query);
    const filteredResults = (data || []).filter(u => !memberUserIds.has(u.id));
    setSearchResults(filteredResults);
    setShowDropdown(true);
    setSearching(false);
  }, [memberUserIds]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (emailQuery.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchUsers(emailQuery);
      }, 300);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [emailQuery, searchUsers]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectUser = (user: SearchUser) => {
    setSelectedUser(user);
    setEmailQuery(user.email);
    setShowDropdown(false);
  };

  const handleEmailChange = (value: string) => {
    setEmailQuery(value);
    setSelectedUser(null);
  };

  const handleAddMember = async () => {
    if (!selectedUser) return;
    setAdding(true);
    await projectService.addProjectMember(projectId, selectedUser.id, selectedRole);
    setShowAddMember(false);
    setSelectedUser(null);
    setSelectedRole('member');
    setEmailQuery('');
    setSearchResults([]);
    onUpdate();
    setAdding(false);
  };

  const handleRoleChange = async (memberId: string, newRole: ProjectRole) => {
    await projectService.updateProjectMemberRole(memberId, newRole);
    setMenuOpen(null);
    onUpdate();
  };

  const handleRemoveMember = async (memberId: string) => {
    await projectService.removeProjectMember(memberId);
    setMenuOpen(null);
    onUpdate();
  };

  const handleCancel = () => {
    setShowAddMember(false);
    setSelectedUser(null);
    setEmailQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Team Members ({members.length})</h3>
        {canManageMembers && (
          <button
            onClick={() => setShowAddMember(!showAddMember)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add Member
          </button>
        )}
      </div>

      {showAddMember && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Search by email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={emailQuery}
                onChange={(e) => handleEmailChange(e.target.value)}
                onFocus={() => emailQuery.length >= 2 && setShowDropdown(true)}
                placeholder="Enter email address..."
                className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                autoComplete="off"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
              {!searching && emailQuery && (
                <button
                  onClick={() => handleEmailChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {showDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center">
                    {emailQuery.length < 2 ? (
                      <p className="text-sm text-gray-500">Type at least 2 characters to search</p>
                    ) : searching ? (
                      <p className="text-sm text-gray-500">Searching...</p>
                    ) : (
                      <div>
                        <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 font-medium">No users found</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Only registered users can be added
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-1">
                    {searchResults.map(user => (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                      >
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.full_name} className="w-9 h-9 rounded-full" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                            {user.full_name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedUser && (
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-3">
                {selectedUser.avatar_url ? (
                  <img src={selectedUser.avatar_url} alt={selectedUser.full_name} className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                    {selectedUser.full_name.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{selectedUser.full_name}</p>
                  <p className="text-xs text-gray-500">{selectedUser.email}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setEmailQuery('');
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                >
                  {ROLE_OPTIONS.map(role => (
                    <option key={role} value={role}>{ROLE_CONFIG[role].label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-gray-200">
            <button
              onClick={handleAddMember}
              disabled={!selectedUser || adding}
              className="px-3 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {adding ? 'Adding...' : 'Add Member'}
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {members.map(member => {
          const roleConfig = ROLE_CONFIG[member.role];
          const RoleIcon = roleConfig.icon;
          const isCurrentUser = member.user_id === currentUser?.id;
          const isMemberOwner = member.role === 'owner';

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group"
            >
              <div className="flex items-center gap-3">
                {member.user?.avatar_url ? (
                  <img
                    src={member.user.avatar_url}
                    alt={member.user.full_name}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                    {member.user?.full_name?.charAt(0) || '?'}
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {member.user?.full_name || 'Unknown'}
                    {isCurrentUser && <span className="text-gray-400 text-sm ml-1">(you)</span>}
                  </p>
                  <p className="text-xs text-gray-500">{member.user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 ${roleConfig.color}`}>
                  <RoleIcon className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{roleConfig.label}</span>
                </div>

                {canManageMembers && !isMemberOwner && !isCurrentUser && (
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {menuOpen === member.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                        <div className="px-3 py-1.5 text-xs font-medium text-gray-400">Change Role</div>
                        {ROLE_OPTIONS.map(role => (
                          <button
                            key={role}
                            onClick={() => handleRoleChange(member.id, role)}
                            className={`w-full px-3 py-1.5 text-sm text-left hover:bg-gray-50 flex items-center gap-2 ${
                              member.role === role ? 'text-gray-900 font-medium' : 'text-gray-600'
                            }`}
                          >
                            {ROLE_CONFIG[role].label}
                            {member.role === role && <span className="text-green-500">*</span>}
                          </button>
                        ))}
                        <div className="border-t border-gray-100 my-1" />
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="w-full px-3 py-1.5 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <X className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
