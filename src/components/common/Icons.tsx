import type React from "react";
import { Icon } from "./Icon";

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "name"> {
  size?: number;
  animated?: boolean;
}

function LegacyIcon({
  name,
  size = 24,
  animated = false,
  className = "",
  ...props
}: IconProps & {
  name: "plant" | "droplet" | "warning" | "settings" | "beaker" | "check";
}) {
  return (
    <Icon
      name={name}
      size={size}
      animate={animated ? "pulse" : "none"}
      className={className}
      {...props}
    />
  );
}

export const SproutIcon: React.FC<IconProps> = (props) => (
  <LegacyIcon name="plant" {...props} />
);
export const DropletIcon: React.FC<IconProps> = (props) => (
  <LegacyIcon name="droplet" {...props} />
);
export const WarningIcon: React.FC<IconProps> = (props) => (
  <LegacyIcon name="warning" {...props} />
);
export const WrenchIcon: React.FC<IconProps> = (props) => (
  <LegacyIcon name="settings" {...props} />
);
export const BeakerIcon: React.FC<IconProps> = (props) => (
  <LegacyIcon name="beaker" {...props} />
);
export const CheckCircleIcon: React.FC<IconProps> = (props) => (
  <LegacyIcon name="check" {...props} />
);
