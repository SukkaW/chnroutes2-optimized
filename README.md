# chnroutes2-optmized

chnroutes2 (better-aggregated chnroutes), but even better.

The source data comes from [misakaio/chnroutes2](https://github.com/misakaio/chnroutes2), which uses BGP feed from various sources to provide more accurate and up-to-date CN routes. Upon that data, we apply more optimizations to better fits our needs:

- Resolve many issues reported to [misakaio/chnroutes2](https://github.com/misakaio/chnroutes2) where non Mainland China prefixes are included.
- Add more Mainland China prefixes that [misakaio/chnroutes2](https://github.com/misakaio/chnroutes2) failed to include.
- Merge more prefixes using [fast-cidr-tools](https://github.com/SukkaW/fast-cidr-tools).

## Usage

- [`chnroutes.txt`](https://chnroutes2.cdn.skk.moe/chnroutes.txt): the text file containing all known IPv4 prefixes broadcast and used in the Mainland China.
- [`reversed-chnroutes.txt`](https://chnroutes2.cdn.skk.moe/reversed-chnroutes.txt): the text file containing all reversed IPv4 prefixes (0.0.0.0/8 minus the prefixes in `/chnroutes.txt` and all preserved IPv4 prefixes).

If you are looking for the usage for proxy platforms, please refer to the [SukkaW/Surge](https://github.com/sukkaw/surge) project:

- Surge
  - IPv4 `https://ruleset.skk.moe/List/ip/china_ip.conf`
  - IPv6 `https://ruleset.skk.moe/List/ip/china_ipv6.conf`
- Clash Premium (Dreamacro), Clah.Meta (Mihomo)
  - IPv4 `https://ruleset.skk.moe/Clash/ip/china_ip.txt`
  - IPv6 `https://ruleset.skk.moe/Clash/ip/china_ipv6.txt`
- sing-box
  - IPv4 `https://ruleset.skk.moe/sing-box/ip/china_ip.json`
  - IPv6 `https://ruleset.skk.moe/sing-box/ip/china_ipv6.json`

## License

[MIT](./LICENSE) and [CC-BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/)

----

**chnroutes2-optmized** © [Sukka](https://github.com/SukkaW), Authored and maintained by Sukka with help from contributors ([list](https://github.com/SukkaW/chnroutes2-optimized/graphs/contributors)).

> [Personal Website](https://skk.moe) · [Blog](https://blog.skk.moe) · GitHub [@SukkaW](https://github.com/SukkaW) · Telegram Channel [@SukkaChannel](https://t.me/SukkaChannel) · Twitter [@isukkaw](https://twitter.com/isukkaw) · Keybase [@sukka](https://keybase.io/sukka)

<p align="center">
  <a href="https://github.com/sponsors/SukkaW/">
    <img src="https://sponsor.cdn.skk.moe/sponsors.svg"/>
  </a>
</p>
