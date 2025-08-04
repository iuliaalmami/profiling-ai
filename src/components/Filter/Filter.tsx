import './Filter.scss';
import { Typography, Select, Input, Space } from 'antd';

const { Option } = Select;

const clients = ['all', 'GSK', 'Client B', 'Client C'];

interface FiltersBarProps {
  selectedClient: string;
  setSelectedClient: (value: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

export default function FiltersBar({
  selectedClient,
  setSelectedClient,
  searchQuery,
  setSearchQuery,
}: FiltersBarProps) {
  return (
    <div className="filters-bar">
      <Typography.Text strong>Filters:</Typography.Text>

      <Space direction="horizontal">
        <Typography.Text>Client:</Typography.Text>
        <Select
          value={selectedClient}
          onChange={value => setSelectedClient(value)}
          placeholder="all"
          style={{ width: 150 }}
        >
          {clients.map(client => (
            <Option key={client} value={client}>
              {client}
            </Option>
          ))}
        </Select>
      </Space>

      <Space direction="horizontal">
        <Typography.Text>Search:</Typography.Text>
        <Input
          placeholder="example"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ width: 200 }}
        />
      </Space>
    </div>
  );
}
