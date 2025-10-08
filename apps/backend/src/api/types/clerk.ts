export interface ClerkEmailAddress {
  email_address?: string;
}

export interface ClerkUserData {
  id: string;
  email_addresses?: ClerkEmailAddress[];
}

export interface ClerkOrganizationData {
  id: string;
  name?: string;
}

export interface ClerkOrganizationMembershipData {
  public_user_data?: {
    user_id?: string;
  };
  organization?: {
    id?: string;
  };
  role?: string;
}

export type ClerkUserCreatedEvent = {
  type: 'user.created';
  data: ClerkUserData;
};

export type ClerkUserUpdatedEvent = {
  type: 'user.updated';
  data: ClerkUserData;
};

export type ClerkUserDeletedEvent = {
  type: 'user.deleted';
  data: ClerkUserData;
};

export type ClerkOrganizationCreatedEvent = {
  type: 'organization.created';
  data: ClerkOrganizationData;
};

export type ClerkOrganizationUpdatedEvent = {
  type: 'organization.updated';
  data: ClerkOrganizationData;
};

export type ClerkOrganizationMembershipCreatedEvent = {
  type: 'organizationMembership.created';
  data: ClerkOrganizationMembershipData;
};
