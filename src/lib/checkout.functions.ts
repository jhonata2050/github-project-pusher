import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getOSOptions = createServerFn({ method: "GET" })
  .handler(async () => {
    return [
      { id: "ubuntu-22-04", name: "Ubuntu 22.04 LTS" },
      { id: "ubuntu-24-04", name: "Ubuntu 24.04 LTS" },
      { id: "debian-12", name: "Debian 12" },
      { id: "centos-7", name: "CentOS 7" },
      { id: "almalinux-9", name: "AlmaLinux 9" },
      { id: "windows-2022", name: "Windows Server 2022" },
    ];
  });

export const getLocations = createServerFn({ method: "GET" })
  .handler(async () => {
    return [
      { id: "us-east", name: "EUA - Leste (Nova York)" },
      { id: "us-west", name: "EUA - Oeste (Los Angeles)" },
      { id: "br-sp", name: "Brasil - São Paulo" },
      { id: "eu-ger", name: "Europa - Alemanha" },
    ];
  });
