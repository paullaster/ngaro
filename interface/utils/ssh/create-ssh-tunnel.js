import { createTunnel } from "tunnel-ssh";

export async function createSSHTunnel(sshConfig, type = 'password', phrase = null) {
    const sshConf = await sshConfig(process.env.SSH_HOST_REMOTE_CREDENTIAL, type, phrase);
    const tunnel = await createTunnel(sshConf.tunnelOptions, sshConf.serverOptions, sshConf.sshOptions, sshConf.forwardOptions);
    console.log('tunnel connection established: ');

}